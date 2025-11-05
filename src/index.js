/**
 * Cloudflare Worker for serving Pyodide-based ML model
 * Uses GitHub CDN (jsDelivr) to serve the model file
 */
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Addiction Predictor</title>
    <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 5px;
            display: none;
        }
        .result.low {
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.medium {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .result.high {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .loading {
            text-align: center;
            color: #666;
            font-style: italic;
        }
        .error {
            color: #dc3545;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .info {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            color: #0066cc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Social Media Addiction Predictor</h1>
        <div class="info">
            This tool runs entirely in your browser using WebAssembly. Your data never leaves your device.
        </div>
        <div id="loading" class="loading">Loading model...</div>
        <div id="error" class="error" style="display: none;"></div>

        <form id="predictionForm">
            <div class="form-group">
                <label for="age">Age:</label>
                <input type="number" id="age" name="age" min="13" max="100" required>
            </div>

            <div class="form-group">
                <label for="gender">Gender:</label>
                <select id="gender" name="gender" required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="academic_level">Academic Level:</label>
                <select id="academic_level" name="academic_level" required>
                    <option value="">Select Academic Level</option>
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Postgraduate">Postgraduate</option>
                </select>
            </div>

            <div class="form-group">
                <label for="country">Country:</label>
                <input type="text" id="country" name="country" required>
            </div>

            <div class="form-group">
                <label for="avg_daily_usage_hours">Average Daily Usage (hours):</label>
                <input type="number" id="avg_daily_usage_hours" name="avg_daily_usage_hours" min="0" max="24" step="0.5" required>
            </div>

            <div class="form-group">
                <label for="most_used_platform">Most Used Platform:</label>
                <select id="most_used_platform" name="most_used_platform" required>
                    <option value="">Select Platform</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Twitter">Twitter</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Snapchat">Snapchat</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="affects_academic_performance">Affects Academic Performance:</label>
                <select id="affects_academic_performance" name="affects_academic_performance" required>
                    <option value="">Select Impact</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Sometimes">Sometimes</option>
                </select>
            </div>

            <div class="form-group">
                <label for="sleep_hours_per_night">Sleep Hours Per Night:</label>
                <input type="number" id="sleep_hours_per_night" name="sleep_hours_per_night" min="0" max="24" step="0.5" required>
            </div>

            <div class="form-group">
                <label for="mental_health_score">Mental Health Score (1-10):</label>
                <input type="number" id="mental_health_score" name="mental_health_score" min="1" max="10" required>
            </div>

            <div class="form-group">
                <label for="relationship_status">Relationship Status:</label>
                <select id="relationship_status" name="relationship_status" required>
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="In a relationship">In a relationship</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div class="form-group">
                <label for="conflicts_over_social_media">Conflicts Over Social Media:</label>
                <select id="conflicts_over_social_media" name="conflicts_over_social_media" required>
                    <option value="">Select Frequency</option>
                    <option value="Never">Never</option>
                    <option value="Rarely">Rarely</option>
                    <option value="Sometimes">Sometimes</option>
                    <option value="Often">Often</option>
                    <option value="Very Often">Very Often</option>
                </select>
            </div>

            <button type="submit" id="predictBtn" disabled>Predict Addiction Risk</button>
        </form>

        <div id="result" class="result"></div>
    </div>

    <script>
        let pyodide;
        let modelLoaded = false;

        async function loadModel() {
            try {
                pyodide = await loadPyodide();

                // Install required packages
                await pyodide.loadPackage(['micropip', 'numpy', 'scikit-learn', 'pandas', 'joblib']);

                // Load the model service
                await pyodide.runPythonAsync(\`
                    import micropip
                    await micropip.install(['scikit-learn', 'pandas', 'numpy', 'joblib'])

                    import json
                    import pickle
                    import base64
                    from js import fetch

                    # Load the model from GitHub via jsDelivr CDN
                    # IMPORTANT: Replace YOUR_USERNAME and YOUR_REPO with your actual GitHub details
                    model_url = 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO@main/model.pkl'

                    response = await fetch(model_url)
                    if not response.ok:
                        raise Exception(f"Failed to fetch model: {response.status}")

                    model_bytes = await response.bytes()

                    # Load the model using pickle
                    import io
                    import joblib
                    model_buffer = io.BytesIO(model_bytes)
                    model_data = joblib.load(model_buffer)

                    model = model_data['model']
                    label_encoders = model_data['label_encoders']
                    feature_columns = model_data['feature_columns']
                    model_metrics = model_data['model_metrics']

                    def preprocess_input(input_data):
                        import pandas as pd
                        import numpy as np

                        # Create DataFrame from input data
                        df = pd.DataFrame([input_data])

                        # Map column names to match training data
                        column_mapping = {
                            'age': 'Age',
                            'gender': 'Gender',
                            'academic_level': 'Academic_Level',
                            'country': 'Country',
                            'avg_daily_usage_hours': 'Avg_Daily_Usage_Hours',
                            'most_used_platform': 'Most_Used_Platform',
                            'affects_academic_performance': 'Affects_Academic_Performance',
                            'sleep_hours_per_night': 'Sleep_Hours_Per_Night',
                            'mental_health_score': 'Mental_Health_Score',
                            'relationship_status': 'Relationship_Status',
                            'conflicts_over_social_media': 'Conflicts_Over_Social_Media'
                        }

                        df = df.rename(columns=column_mapping)

                        # Apply label encoding
                        for col, encoder in label_encoders.items():
                            if col in df.columns:
                                # Handle unseen categories
                                if df[col].iloc[0] in encoder.classes_:
                                    df[col] = encoder.transform(df[col])
                                else:
                                    # Assign -1 for unseen categories
                                    df[col] = -1

                        # Ensure all expected columns are present and in correct order
                        for col in feature_columns:
                            if col not in df.columns:
                                df[col] = 0  # Default value for missing columns

                        # Select and reorder columns
                        df = df[feature_columns]

                        return df

                    def predict_addiction(input_data):
                        try:
                            # Preprocess input
                            processed_data = preprocess_input(input_data)

                            # Make prediction
                            prediction = model.predict(processed_data)[0]

                            # Ensure prediction is within expected range
                            prediction = max(1.0, min(10.0, float(prediction)))

                            # Determine risk category
                            if prediction <= 3:
                                risk_category = "Low"
                            elif prediction <= 7:
                                risk_category = "Medium"
                            else:
                                risk_category = "High"

                            # Calculate confidence
                            base_confidence = model_metrics['test_r2'] * 100
                            confidence = max(60, min(95, int(base_confidence)))

                            return {
                                "predicted_addiction_score": round(prediction, 2),
                                "risk_category": risk_category,
                                "confidence": confidence
                            }
                        except Exception as e:
                            return {"error": str(e)}

                    print("Model loaded successfully!")
                \`);

                modelLoaded = true;
                document.getElementById('loading').style.display = 'none';
                document.getElementById('predictBtn').disabled = false;
                console.log('Model loaded successfully');
            } catch (error) {
                console.error('Error loading model:', error);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Error loading model: ' + error.message;
            }
        }

        // Load model when page loads
        loadModel();

        // Handle form submission
        document.getElementById('predictionForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!modelLoaded) {
                alert('Model is still loading. Please wait...');
                return;
            }

            const formData = new FormData(e.target);
            const inputData = {};
            formData.forEach((value, key) => {
                inputData[key] = value;
            });

            // Convert numeric fields
            inputData['age'] = parseFloat(inputData['age']);
            inputData['avg_daily_usage_hours'] = parseFloat(inputData['avg_daily_usage_hours']);
            inputData['sleep_hours_per_night'] = parseFloat(inputData['sleep_hours_per_night']);
            inputData['mental_health_score'] = parseFloat(inputData['mental_health_score']);

            try {
                const result = await pyodide.runPythonAsync(\`
                    predict_addiction(\${JSON.stringify(inputData)})
                \`);

                displayResult(result);
            } catch (error) {
                console.error('Prediction error:', error);
                document.getElementById('error').style.display = 'block';
                document.getElementById('error').textContent = 'Prediction error: ' + error.message;
            }
        });

        function displayResult(result) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.className = 'result ' + result.risk_category.toLowerCase();

            resultDiv.innerHTML = \`
                <h3>Prediction Results</h3>
                <p><strong>Predicted Addiction Score:</strong> \${result.predicted_addiction_score}/10</p>
                <p><strong>Risk Category:</strong> \${result.risk_category}</p>
                <p><strong>Confidence:</strong> \${result.confidence}%</p>
                \${result.risk_category === 'High' ? '<p><strong>Recommendation:</strong> Consider reducing social media usage and seeking support if needed.</p>' : ''}
                \${result.risk_category === 'Medium' ? '<p><strong>Recommendation:</strong> Monitor your usage patterns and consider setting healthy boundaries.</p>' : ''}
                \${result.risk_category === 'Low' ? '<p><strong>Recommendation:</strong> Continue maintaining healthy social media habits.</p>' : ''}
            \`;
        }
    </script>
</body>
</html>`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Serve the main HTML page
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return new Response(HTML_CONTENT, {
                headers: {
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // 404 for other routes
        return new Response('Not Found', { status: 404 });
    },
};