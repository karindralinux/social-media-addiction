let pyodide;
let modelLoaded = false;

// 1. LOAD MODEL
async function loadModel() {
    try {
        pyodide = await loadPyodide();
        
        console.log("Sedang memuat Python...");
        
        // Kode Python LENGKAP untuk menangani semua input form
        await pyodide.runPythonAsync(`
            import json
            from js import fetch
            import pyodide

            # Load Model JSON dari Github
            response = await fetch('https://raw.githubusercontent.com/karindralinux/social-media-addiction/refs/heads/main/model/model_pyodide.json')
            model_data = json.loads(await response.text())
            trees = model_data.get('trees', [])
            label_encoders = model_data.get('label_encoders', {})
            
            # Fungsi untuk menelusuri satu pohon keputusan
            def predict_single_tree(features, tree):
                node = 0
                tree_data = tree.get('tree', tree)
                while True:
                    if 'children_left' not in tree_data: return 0.0
                    # Cek leaf node
                    left = tree_data['children_left'][node]
                    if left == -1:
                        val = tree_data['value'][node]
                        return float(val[0][0]) if isinstance(val, list) else float(val)
                    
                    # Cek kondisi
                    feat_idx = tree_data['feature'][node]
                    threshold = tree_data['threshold'][node]
                    
                    if feat_idx >= len(features): return 0.0 # Safety check

                    if features[feat_idx] <= threshold:
                        node = left
                    else:
                        node = tree_data['children_right'][node]

            # Fungsi Utama Prediksi
            def predict_addiction(input_json):
                input_data = json.loads(input_json)
                
                # Mapping Data: Urutan fitur harus SAMA dengan data training (11 Fitur)
                # [Age, Gender, Academic, Country, Usage, Platform, Affects, Sleep, Mental, Relationship, Conflict]
                
                # Helper untuk encoding string ke angka
                def encode(col_name, value):
                    if col_name in label_encoders:
                        classes = label_encoders[col_name]['classes']
                        if value in classes:
                            return float(classes.index(value))
                    return -1.0 # Jika tidak ditemukan

                # Siapkan array fitur (11 item)
                features = [
                    float(input_data.get('age', 0)),                                    # 0. Age
                    encode('gender', input_data.get('gender')),                         # 1. Gender
                    encode('academic_level', input_data.get('academic_level')),         # 2. Academic
                    encode('country', input_data.get('country')),                       # 3. Country
                    float(input_data.get('avg_daily_usage_hours', 0)),                  # 4. Usage Hours
                    encode('most_used_platform', input_data.get('most_used_platform')), # 5. Platform
                    encode('affects_academic_performance', input_data.get('affects_academic_performance')), # 6. Affects
                    float(input_data.get('sleep_hours_per_night', 0)),                  # 7. Sleep
                    float(input_data.get('mental_health_score', 0)),                    # 8. Mental Score
                    encode('relationship_status', input_data.get('relationship_status')), # 9. Relationship
                    float(input_data.get('conflicts_over_social_media', 0))             # 10. Conflict
                ]

                # Hitung Prediksi (Random Forest = Rata-rata semua pohon)
                total_pred = 0
                for tree in trees:
                    total_pred += predict_single_tree(features, tree)
                
                avg_score = total_pred / len(trees)
                
                # Tentukan Kategori
                avg_score = max(1.0, min(10.0, avg_score)) # Clip 1-10
                if avg_score <= 3: risk = "Low"
                elif avg_score <= 7: risk = "Medium"
                else: risk = "High"
                
                # Confidence dummy (berdasarkan R2 score model asli)
                confidence = 85 

                return {
                    "score": round(avg_score, 2),
                    "risk": risk,
                    "confidence": confidence
                }
        `);

        modelLoaded = true;
        document.getElementById("loading").style.display = "none";
        const btn = document.getElementById("predictBtn");
        btn.disabled = false;
        btn.innerText = "✨ Predict Addiction Risk"; // Kembalikan teks tombol
        console.log("AI Model Siap!");

    } catch (error) {
        console.error("Error loading model:", error);
        document.getElementById("loading").innerHTML = `<p class="tw-text-red-500">Failed to load AI Model. Check connection.</p>`;
    }
}

loadModel();

// 2. HANDLE FORM SUBMIT
// Function to setup form handler (works whether DOM is ready or not)
const setupFormHandler = () => {
    const form = document.getElementById("predictionForm");
    if (!form) {
        console.error("Form not found! Retrying...");
        // Retry after a short delay if form not found
        setTimeout(setupFormHandler, 100);
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Check if model is loaded
        if (!modelLoaded || !pyodide) {
            alert("Model is still loading. Please wait...");
            return;
        }
        
        const btn = document.getElementById("predictBtn");
        const originalText = btn.innerText;
        btn.innerText = "Analyzing...";
        btn.disabled = true;

        // Hide error message if visible
        const errorDiv = document.getElementById("error");
        if (errorDiv) {
            errorDiv.classList.add("tw-hidden");
        }

        // Ambil SEMUA data form
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Convert numeric fields
        const numericFields = ['age', 'avg_daily_usage_hours', 'sleep_hours_per_night', 'mental_health_score', 'conflicts_over_social_media'];
        numericFields.forEach(field => {
            if (data[field]) {
                data[field] = parseFloat(data[field]) || 0;
            }
        });

        try {
            // Escape JSON string properly for Python (handle quotes)
            const jsonString = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            
            // Kirim ke Python - use Python's json module to handle the string properly
            const resultProxy = await pyodide.runPythonAsync(`
                import json
                input_json = '${jsonString}'
                result = predict_addiction(input_json)
                # Convert Python dict to JSON string for JavaScript
                json.dumps(result)
            `);
            
            // Convert result from Python JSON string to JavaScript object
            let result;
            try {
                if (typeof resultProxy === 'string') {
                    result = JSON.parse(resultProxy);
                } else if (resultProxy && typeof resultProxy === 'object') {
                    // Try to convert Pyodide proxy object
                    if (resultProxy.toJs) {
                        const jsResult = resultProxy.toJs();
                        // Handle Map conversion
                        if (jsResult instanceof Map) {
                            result = Object.fromEntries(jsResult);
                        } else if (jsResult && typeof jsResult === 'object') {
                            result = jsResult;
                        } else {
                            result = JSON.parse(String(jsResult));
                        }
                    } else {
                        // Direct object access
                        result = {
                            score: resultProxy.score || resultProxy.get?.('score'),
                            risk: resultProxy.risk || resultProxy.get?.('risk'),
                            confidence: resultProxy.confidence || resultProxy.get?.('confidence') || 85
                        };
                    }
                } else {
                    result = JSON.parse(String(resultProxy));
                }
            } catch (parseError) {
                console.error("Error parsing result:", parseError, "Raw result:", resultProxy);
                // Try alternative conversion
                result = {
                    score: resultProxy?.score || 0,
                    risk: resultProxy?.risk || "Unknown",
                    confidence: resultProxy?.confidence || 85
                };
            }

            console.log("Prediction result:", result);

            // Validate result structure
            if (!result || result.score === undefined || result.score === null || !result.risk) {
                console.error("Invalid result structure:", result);
                throw new Error("Invalid prediction result structure. Received: " + JSON.stringify(result));
            }

            // Tampilkan Hasil
            displayResult(result);

        } catch (err) {
            console.error("Prediction error:", err);
            const errorDiv = document.getElementById("error");
            const errorText = document.getElementById("error-text");
            if (errorDiv && errorText) {
                errorDiv.classList.remove("tw-hidden");
                errorText.textContent = err.message || "An error occurred during prediction. Please try again.";
            } else {
                alert("Error during prediction: " + (err.message || err));
            }
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
};

// Setup form handler - try immediately and also on DOMContentLoaded as fallback
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupFormHandler);
} else {
    // DOM is already loaded
    setupFormHandler();
}

// 3. TAMPILAN HASIL
function displayResult(result) {
    const resultDiv = document.getElementById("result");
    const contentDiv = document.getElementById("result-content");
    
    if (!resultDiv || !contentDiv) {
        console.error("Result elements not found!");
        return;
    }
    
    // Remove hidden class to show result
    resultDiv.classList.remove("tw-hidden");
    
    // Icon & Warna berdasarkan risiko
    let icon = "😊";
    let colorClass = "tw-bg-green-500";
    let textClass = "tw-text-green-600";
    let borderClass = "tw-border-green-500";
    let message = "Great job! Keep maintaining your healthy habits.";

    if(result.risk === "Medium") {
        icon = "😐";
        colorClass = "tw-bg-yellow-500";
        textClass = "tw-text-yellow-600";
        borderClass = "tw-border-yellow-500";
        message = "Be careful. Consider setting time limits for social media.";
    } else if(result.risk === "High") {
        icon = "🚨";
        colorClass = "tw-bg-red-500";
        textClass = "tw-text-red-600";
        borderClass = "tw-border-red-500";
        message = "Warning! High addiction risk detected. Please seek balance immediately.";
    }

    // Ensure score and confidence are numbers
    const score = typeof result.score === 'number' ? result.score : parseFloat(result.score) || 0;
    const confidence = typeof result.confidence === 'number' ? result.confidence : parseFloat(result.confidence) || 85;

    contentDiv.innerHTML = `
        <div class="tw-mb-6">
            <div class="tw-text-6xl tw-mb-4">${icon}</div>
            <h2 class="tw-text-3xl tw-font-bold tw-text-gray-800 tw-mb-2">Your Results</h2>
            <div class="tw-inline-flex tw-items-center tw-px-6 tw-py-2 tw-rounded-full tw-text-white tw-font-bold tw-text-lg tw-mb-6 ${colorClass}">
                ${result.risk} Risk
            </div>
        </div>

        <div class="tw-grid md:tw-grid-cols-3 tw-gap-6 tw-mb-8">
            <div class="tw-bg-purple-50 tw-rounded-xl tw-p-6">
                <div class="tw-text-4xl tw-font-bold tw-text-purple-600 tw-mb-2">${score}</div>
                <div class="tw-text-gray-600 tw-text-sm">Addiction Score (1-10)</div>
            </div>
            <div class="tw-bg-blue-50 tw-rounded-xl tw-p-6">
                <div class="tw-text-4xl tw-font-bold tw-text-blue-600 tw-mb-2">${result.risk}</div>
                <div class="tw-text-gray-600 tw-text-sm">Risk Level</div>
            </div>
            <div class="tw-bg-pink-50 tw-rounded-xl tw-p-6">
                <div class="tw-text-4xl tw-font-bold tw-text-pink-600 tw-mb-2">${confidence}%</div>
                <div class="tw-text-gray-600 tw-text-sm">Confidence</div>
            </div>
        </div>

        <div class="tw-bg-gray-50 tw-border-l-4 ${borderClass} tw-p-6 tw-rounded-lg tw-text-left">
            <h3 class="tw-text-lg tw-font-semibold tw-text-gray-800 tw-mb-2">Recommendation</h3>
            <p class="${textClass} tw-leading-relaxed">${message}</p>
        </div>
    `;

    // Scroll smooth ke hasil
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
}