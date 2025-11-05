# Social Media Addiction Predictor

A web-based machine learning application that predicts social media addiction risk using Pyodide (Python in WebAssembly). The model runs entirely in the browser, ensuring user privacy.

## Features

- **Client-side ML**: Predictions run in your browser using WebAssembly
- **Privacy-focused**: No data is sent to external servers
- **Real-time predictions**: Instant feedback on social media addiction risk
- **Comprehensive assessment**: Multiple factors including usage patterns, mental health, and academic impact

## How It Works

1. **Model Loading**: The trained Random Forest model (`model.pkl`) is loaded from a CDN
2. **Pyodide Runtime**: Python packages (scikit-learn, pandas, numpy) run in the browser
3. **Data Processing**: User input is preprocessed using the same pipeline as training
4. **Prediction**: The model predicts addiction score (1-10) and risk category

## File Structure

```
.
├── model/
│   ├── model.pkl                      # Trained ML model
│   └── train_model.ipynb             # Model training notebook
├── index.html                         # Local development version
├── src/
│   └── index.js                       # Cloudflare Worker (production)
├── wrangler.toml                      # Cloudflare configuration
└── README.md                          # This file
```

## Model Details

- **Algorithm**: Random Forest Regressor
- **Input Features**: 11 factors including age, usage hours, mental health, etc.
- **Output**: Addiction score (1-10) with risk categorization
- **Performance**: R² score and confidence intervals

## Input Features

1. **Age**: User's age (13-100)
2. **Gender**: Male, Female, or Other
3. **Academic Level**: High School, Undergraduate, Graduate, Postgraduate
4. **Country**: User's country
5. **Daily Usage Hours**: Average hours spent on social media daily
6. **Primary Platform**: Most used social media platform
7. **Academic Impact**: Effect on academic performance
8. **Sleep Hours**: Hours of sleep per night
9. **Mental Health Score**: Self-rated mental health (1-10)
10. **Relationship Status**: Current relationship status
11. **Conflicts**: Frequency of conflicts over social media use

## Risk Categories

- **Low (1-3)**: Healthy social media habits
- **Medium (4-7)**: Moderate risk, monitor usage patterns
- **High (8-10)**: High risk, consider reducing usage and seeking support

## Local Development

1. **Start local server**:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open browser**:
   ```
   http://localhost:8000
   ```

## Cloudflare Workers Deployment

### Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- GitHub repository for model hosting

### Steps

1. **Upload model to GitHub**:
   - Create a public repository
   - Upload `model/model.pkl` to the main branch

2. **Update model URL**:
   - Edit `src/index.js` line 240
   - Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub details

3. **Deploy**:
   ```bash
   wrangler login
   wrangler deploy
   ```

### Model URL Formats

Choose one of these CDN options:

```javascript
// jsDelivr (recommended)
model_url = 'https://cdn.jsdelivr.net/gh/username/repo@main/model/model.pkl'

// Raw GitHub
model_url = 'https://raw.githubusercontent.com/username/repo/main/model/model.pkl'

// GitHub Pages
model_url = 'https://username.github.io/repo/model/model.pkl'
```

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript
- **ML Runtime**: Pyodide (Python WebAssembly)
- **ML Libraries**: scikit-learn, pandas, numpy, joblib
- **Hosting**: Cloudflare Workers
- **CDN**: jsDelivr/GitHub for model serving

## Privacy & Security

- ✅ All processing happens client-side
- ✅ No personal data transmitted
- ✅ Model predictions remain private
- ✅ No server-side storage of user inputs

## Performance Considerations

- **Initial Load**: ~10-15 seconds (Pyodide + model download)
- **Subsequent Predictions**: <1 second
- **Model Size**: Optimize for <25MB for Cloudflare limits
- **Browser Compatibility**: Modern browsers with WebAssembly support

## Model Training (Reference)

The model was trained using:
- Dataset: Social media usage and mental health survey data
- Features: 11 predictors of addiction risk
- Algorithm: Random Forest with hyperparameter tuning
- Validation: Train-test split with cross-validation

## Contributing

1. Fork the repository
2. Retrain or improve the model
3. Update the model file and features
4. Test locally and deploy
5. Submit a pull request

## License

This project is for educational and research purposes. Ensure compliance with data privacy regulations when deploying in production.

## Troubleshooting

**Model not loading**: Check GitHub URL and ensure repository is public
**Slow performance**: Consider model compression or smaller models
**Memory errors**: Large models may exceed browser memory limits
**CORS issues**: Ensure model is hosted on a public repository with proper CORS headers

## Support

For issues related to:
- **Model performance**: Check the training pipeline and feature engineering
- **Deployment**: Review Cloudflare Workers documentation
- **Pyodide issues**: Check browser compatibility and WebAssembly support