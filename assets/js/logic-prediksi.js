let pyodide;
let modelLoaded = false;

// 1. LOAD MODEL
async function loadModel() {
    try {
        pyodide = await loadPyodide();
        
        console.log("Loading Python environment...");
        
        // Complete Python code to handle all form inputs
        await pyodide.runPythonAsync(`
            import json
            from js import fetch
            import pyodide

            # Load Model JSON from Github
            response = await fetch('https://raw.githubusercontent.com/karindralinux/social-media-addiction/refs/heads/main/model/model_pyodide.json')
            model_data = json.loads(await response.text())
            trees = model_data.get('trees', [])
            label_encoders = model_data.get('label_encoders', {})
            
            # Function to traverse a single decision tree
            def predict_single_tree(features, tree):
                node = 0
                tree_data = tree.get('tree', tree)
                while True:
                    if 'children_left' not in tree_data: return 0.0
                    # Check leaf node
                    left = tree_data['children_left'][node]
                    if left == -1:
                        val = tree_data['value'][node]
                        return float(val[0][0]) if isinstance(val, list) else float(val)
                    
                    # Check condition
                    feat_idx = tree_data['feature'][node]
                    threshold = tree_data['threshold'][node]
                    
                    if feat_idx >= len(features): return 0.0 # Safety check

                    if features[feat_idx] <= threshold:
                        node = left
                    else:
                        node = tree_data['children_right'][node]

            # Main Prediction Function
            def predict_addiction(input_json):
                input_data = json.loads(input_json)
                
                # Data Mapping: Feature order must be SAME as training data (11 Features)
                # [Age, Gender, Academic, Country, Usage, Platform, Affects, Sleep, Mental, Relationship, Conflict]
                
                # Helper for encoding string to number
                def encode(col_name, value):
                    if col_name in label_encoders:
                        classes = label_encoders[col_name]['classes']
                        if value in classes:
                            return float(classes.index(value))
                    return -1.0 # If not found

                # Prepare feature array (11 items)
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

                # Calculate Prediction (Random Forest = Average of all trees)
                total_pred = 0
                for tree in trees:
                    total_pred += predict_single_tree(features, tree)
                
                avg_score = total_pred / len(trees)
                
                # Determine Category
                avg_score = max(1.0, min(10.0, avg_score)) # Clip 1-10
                if avg_score <= 3: risk = "Low"
                elif avg_score <= 7: risk = "Medium"
                else: risk = "High"
                
                # Confidence dummy (based on actual model R2 score)
                confidence = 85 

                return {
                    "score": round(avg_score, 2),
                    "risk": risk,
                    "confidence": confidence
                }
        `);

        modelLoaded = true;
        
        // Hide loading indicator
        const loadingDiv = document.getElementById("loading");
        if (loadingDiv) {
            loadingDiv.style.display = "none";
        }
        
        // Enable button using the new helper function
        if (typeof window.updatePredictButton === 'function') {
            window.updatePredictButton('✨ Calculate My Score', true);
        } else {
            // Fallback if helper function not available
            const btn = document.getElementById("predictBtn");
            if (btn) {
                btn.disabled = false;
                const buttonText = btn.querySelector('span span');
                if (buttonText) {
                    buttonText.textContent = '✨ Calculate My Score';
                }
            }
        }
        
        console.log("✅ AI Model Ready!");

    } catch (error) {
        console.error("❌ Error loading model:", error);
        
        // Show error in loading div
        const loadingDiv = document.getElementById("loading");
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div class="flex items-center justify-center space-x-3">
                    <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
                    <span class="text-sm font-medium text-red-600">Failed to load AI Model. Please refresh the page.</span>
                </div>
            `;
        }
        
        // Show error in error div
        const errorDiv = document.getElementById("error");
        const errorText = document.getElementById("error-text");
        if (errorDiv && errorText) {
            errorDiv.classList.remove("hidden");
            errorText.textContent = "Failed to load AI model. Please refresh the page and try again.";
        }
    }
}

// Start loading model
loadModel();

// 2. HANDLE FORM SUBMIT
const setupFormHandler = () => {
    const form = document.getElementById("predictionForm");
    if (!form) {
        console.warn("Form not found! Retrying...");
        setTimeout(setupFormHandler, 100);
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Check if model is loaded
        if (!modelLoaded || !pyodide) {
            alert("⏳ Model is still loading. Please wait a moment...");
            return;
        }
        
        // Update button state to calculating
        if (typeof window.updatePredictButton === 'function') {
            window.updatePredictButton('Analyzing...', false);
        } else {
            const btn = document.getElementById("predictBtn");
            if (btn) {
                btn.disabled = true;
                const buttonText = btn.querySelector('span span');
                if (buttonText) {
                    buttonText.textContent = 'Analyzing...';
                }
            }
        }

        // Hide error message if visible
        const errorDiv = document.getElementById("error");
        if (errorDiv) {
            errorDiv.classList.add("hidden");
        }

        // Hide previous results
        const resultDiv = document.getElementById("result");
        if (resultDiv) {
            resultDiv.classList.add("hidden");
        }

        // Get ALL form data
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        // Convert numeric fields
        const numericFields = ['age', 'avg_daily_usage_hours', 'sleep_hours_per_night', 'mental_health_score', 'conflicts_over_social_media'];
        numericFields.forEach(field => {
            if (data[field]) {
                data[field] = parseFloat(data[field]) || 0;
            }
        });

        console.log("📊 Form data:", data);

        try {
            // Escape JSON string properly for Python
            const jsonString = JSON.stringify(data).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            
            // Send to Python
            const resultProxy = await pyodide.runPythonAsync(`
                import json
                input_json = '${jsonString}'
                result = predict_addiction(input_json)
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
                        if (jsResult instanceof Map) {
                            result = Object.fromEntries(jsResult);
                        } else if (jsResult && typeof jsResult === 'object') {
                            result = jsResult;
                        } else {
                            result = JSON.parse(String(jsResult));
                        }
                    } else {
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
                console.error("⚠️ Error parsing result:", parseError, "Raw result:", resultProxy);
                result = {
                    score: resultProxy?.score || 0,
                    risk: resultProxy?.risk || "Unknown",
                    confidence: resultProxy?.confidence || 85
                };
            }

            console.log("✅ Prediction result:", result);

            // Validate result structure
            if (!result || result.score === undefined || result.score === null || !result.risk) {
                console.error("❌ Invalid result structure:", result);
                throw new Error("Invalid prediction result. Please try again.");
            }

            // Display results using enhanced display function
            if (typeof window.displayEnhancedResults === 'function') {
                window.displayEnhancedResults(result.score, result.risk, result);
            } else {
                // Fallback to basic display
                displayBasicResult(result);
            }

        } catch (err) {
            console.error("❌ Prediction error:", err);
            
            const errorDiv = document.getElementById("error");
            const errorText = document.getElementById("error-text");
            
            if (errorDiv && errorText) {
                errorDiv.classList.remove("hidden");
                errorText.textContent = err.message || "An error occurred during prediction. Please try again.";
            } else {
                alert("❌ Error: " + (err.message || err));
            }
        } finally {
            // Re-enable button
            if (typeof window.updatePredictButton === 'function') {
                window.updatePredictButton('✨ Calculate My Score', true);
            } else {
                const btn = document.getElementById("predictBtn");
                if (btn) {
                    btn.disabled = false;
                    const buttonText = btn.querySelector('span span');
                    if (buttonText) {
                        buttonText.textContent = '✨ Calculate My Score';
                    }
                }
            }
        }
    });
};

// Setup form handler
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupFormHandler);
} else {
    setupFormHandler();
}

// 3. BASIC RESULT DISPLAY (Fallback)
function displayBasicResult(result) {
    const resultDiv = document.getElementById("result");
    const contentDiv = document.getElementById("result-content");
    
    if (!resultDiv || !contentDiv) {
        console.error("Result elements not found!");
        return;
    }
    
    // Show result section
    resultDiv.classList.remove("hidden");
    
    // Determine styling based on risk
    let icon = "😊";
    let colorClass = "bg-green-500";
    let textClass = "text-green-600";
    let message = "Great job! Keep maintaining your healthy habits.";

    if (result.risk === "Medium") {
        icon = "😐";
        colorClass = "bg-yellow-500";
        textClass = "text-yellow-600";
        message = "Be careful. Consider setting time limits for social media.";
    } else if (result.risk === "High") {
        icon = "🚨";
        colorClass = "bg-red-500";
        textClass = "text-red-600";
        message = "Warning! High addiction risk detected. Please seek balance immediately.";
    }

    // Ensure score and confidence are numbers
    const score = typeof result.score === 'number' ? result.score : parseFloat(result.score) || 0;
    const confidence = typeof result.confidence === 'number' ? result.confidence : parseFloat(result.confidence) || 85;

    contentDiv.innerHTML = `
        <div class="mb-8 text-center">
            <div class="text-7xl mb-4">${icon}</div>
            <h2 class="text-4xl font-bold text-gray-900 mb-3">Your Results</h2>
            <div class="inline-flex items-center px-8 py-3 rounded-2xl text-white font-bold text-xl ${colorClass} shadow-lg">
                ${result.risk} Risk Level
            </div>
        </div>

        <div class="grid md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                <div class="text-5xl font-bold text-purple-600 mb-2">${score}</div>
                <div class="text-gray-700 text-sm font-medium">Addiction Score (1-10)</div>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                <div class="text-5xl font-bold text-blue-600 mb-2">${result.risk}</div>
                <div class="text-gray-700 text-sm font-medium">Risk Level</div>
            </div>
            <div class="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 border border-pink-200">
                <div class="text-5xl font-bold text-pink-600 mb-2">${confidence}%</div>
                <div class="text-gray-700 text-sm font-medium">Confidence</div>
            </div>
        </div>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-${result.risk === 'Low' ? 'green' : result.risk === 'Medium' ? 'yellow' : 'red'}-500 p-6 rounded-xl">
            <h3 class="text-lg font-bold text-gray-900 mb-3 flex items-center">
                <i class="fas fa-lightbulb mr-2 ${textClass}"></i>
                Recommendation
            </h3>
            <p class="${textClass} leading-relaxed font-medium">${message}</p>
        </div>
    `;

    // Smooth scroll to results
    setTimeout(() => {
        resultDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
}

console.log("📱 Social Media Addiction Predictor loaded successfully!");