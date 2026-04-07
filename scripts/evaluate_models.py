#!/usr/bin/env python3
"""
Model Evaluation and Comparison Script for CoinVista ML

Evaluates trained models on test data and generates comparison reports.
"""

import os
import sys
import json
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path
import joblib
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import MinMaxScaler
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

class ModelEvaluator:
    def __init__(self, models_dir="models", data_dir="data/processed", results_dir="results"):
        self.models_dir = Path(models_dir)
        self.data_dir = Path(data_dir)
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)
        
        self.evaluation_results = {}
        self.predictions = {}
        
    def load_test_data(self, coin="btc"):
        """Load and prepare test data"""
        data_file = self.data_dir / f"{coin}_ohlcv.csv"
        if not data_file.exists():
            raise FileNotFoundError(f"Data file not found: {data_file}")
            
        df = pd.read_csv(data_file)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Use last 20% as test data
        test_size = int(len(df) * 0.2)
        test_data = df.tail(test_size).copy()
        
        return test_data
    
    def prepare_features(self, data, target_col='close'):
        """Prepare features for model evaluation"""
        feature_cols = [col for col in data.columns if col not in 
                       ['timestamp', target_col] and not col.endswith('_lag_0')]
        
        X = data[feature_cols].fillna(method='ffill').fillna(0)
        y = data[target_col].values
        
        return X, y, feature_cols
    
    def load_model(self, model_path):
        """Load a trained model"""
        try:
            return joblib.load(model_path)
        except Exception as e:
            print(f"Error loading model {model_path}: {e}")
            return None
    
    def calculate_metrics(self, y_true, y_pred, model_name):
        """Calculate evaluation metrics"""
        mse = mean_squared_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_true, y_pred)
        r2 = r2_score(y_true, y_pred)
        
        # Calculate percentage errors
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
        
        # Direction accuracy (for price prediction)
        y_true_diff = np.diff(y_true)
        y_pred_diff = np.diff(y_pred)
        direction_accuracy = np.mean(np.sign(y_true_diff) == np.sign(y_pred_diff)) * 100
        
        return {
            'model': model_name,
            'mse': mse,
            'rmse': rmse,
            'mae': mae,
            'r2': r2,
            'mape': mape,
            'direction_accuracy': direction_accuracy
        }
    
    def evaluate_model(self, model_path, test_data, coin="btc"):
        """Evaluate a single model"""
        model_name = model_path.stem
        print(f"Evaluating {model_name}...")
        
        model = self.load_model(model_path)
        if model is None:
            return None
            
        X_test, y_test, feature_cols = self.prepare_features(test_data)
        
        try:
            y_pred = model.predict(X_test)
            metrics = self.calculate_metrics(y_test, y_pred, model_name)
            
            # Store predictions for plotting
            self.predictions[model_name] = {
                'actual': y_test,
                'predicted': y_pred,
                'timestamps': test_data['timestamp'].values
            }
            
            return metrics
            
        except Exception as e:
            print(f"Error evaluating {model_name}: {e}")
            return None
    
    def evaluate_all_models(self, coin="btc"):
        """Evaluate all models for a given coin"""
        print(f"\n=== Evaluating Models for {coin.upper()} ===")
        
        # Load test data
        test_data = self.load_test_data(coin)
        print(f"Test data shape: {test_data.shape}")
        
        # Find all model files
        model_pattern = f"{coin}_*.pkl"
        model_files = list(self.models_dir.glob(model_pattern))
        
        if not model_files:
            print(f"No models found for {coin} in {self.models_dir}")
            return
            
        print(f"Found {len(model_files)} models to evaluate")
        
        results = []
        for model_file in model_files:
            metrics = self.evaluate_model(model_file, test_data, coin)
            if metrics:
                results.append(metrics)
        
        self.evaluation_results[coin] = results
        return results
    
    def generate_comparison_report(self, coin="btc"):
        """Generate comparison report"""
        if coin not in self.evaluation_results:
            print(f"No evaluation results for {coin}")
            return
            
        results = self.evaluation_results[coin]
        df_results = pd.DataFrame(results)
        
        # Sort by R² score (descending)
        df_results = df_results.sort_values('r2', ascending=False)
        
        print(f"\n=== Model Comparison Report for {coin.upper()} ===")
        print(df_results.round(4).to_string(index=False))
        
        # Save to CSV
        report_file = self.results_dir / f"{coin}_model_comparison.csv"
        df_results.to_csv(report_file, index=False)
        print(f"\nReport saved to: {report_file}")
        
        return df_results
    
    def plot_predictions(self, coin="btc", top_n=3):
        """Plot predictions vs actual for top models"""
        if coin not in self.evaluation_results:
            return
            
        results = self.evaluation_results[coin]
        df_results = pd.DataFrame(results)
        top_models = df_results.nlargest(top_n, 'r2')['model'].tolist()
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        fig.suptitle(f'{coin.upper()} Model Predictions Comparison', fontsize=16)
        
        # Plot 1: Time series comparison
        ax1 = axes[0, 0]
        for model_name in top_models:
            if model_name in self.predictions:
                pred_data = self.predictions[model_name]
                timestamps = pd.to_datetime(pred_data['timestamps'])
                ax1.plot(timestamps, pred_data['actual'], 'k-', alpha=0.7, label='Actual')
                ax1.plot(timestamps, pred_data['predicted'], '--', label=f'{model_name}')
        ax1.set_title('Predictions vs Actual')
        ax1.set_xlabel('Date')
        ax1.set_ylabel('Price')
        ax1.legend()
        ax1.tick_params(axis='x', rotation=45)
        
        # Plot 2: Scatter plot (actual vs predicted)
        ax2 = axes[0, 1]
        for i, model_name in enumerate(top_models):
            if model_name in self.predictions:
                pred_data = self.predictions[model_name]
                ax2.scatter(pred_data['actual'], pred_data['predicted'], 
                           alpha=0.6, label=f'{model_name}')
        
        # Perfect prediction line
        min_val = min([self.predictions[m]['actual'].min() for m in top_models])
        max_val = max([self.predictions[m]['actual'].max() for m in top_models])
        ax2.plot([min_val, max_val], [min_val, max_val], 'r--', alpha=0.8, label='Perfect')
        ax2.set_xlabel('Actual Price')
        ax2.set_ylabel('Predicted Price')
        ax2.set_title('Actual vs Predicted')
        ax2.legend()
        
        # Plot 3: Residuals
        ax3 = axes[1, 0]
        for model_name in top_models:
            if model_name in self.predictions:
                pred_data = self.predictions[model_name]
                residuals = pred_data['actual'] - pred_data['predicted']
                ax3.scatter(pred_data['predicted'], residuals, alpha=0.6, label=f'{model_name}')
        ax3.axhline(y=0, color='r', linestyle='--', alpha=0.8)
        ax3.set_xlabel('Predicted Price')
        ax3.set_ylabel('Residuals')
        ax3.set_title('Residual Plot')
        ax3.legend()
        
        # Plot 4: Metrics comparison
        ax4 = axes[1, 1]
        metrics_df = df_results[df_results['model'].isin(top_models)]
        x_pos = np.arange(len(top_models))
        
        ax4.bar(x_pos - 0.2, metrics_df['r2'], 0.4, label='R²', alpha=0.8)
        ax4_twin = ax4.twinx()
        ax4_twin.bar(x_pos + 0.2, metrics_df['mape'], 0.4, label='MAPE %', alpha=0.8, color='orange')
        
        ax4.set_xlabel('Models')
        ax4.set_ylabel('R² Score')
        ax4_twin.set_ylabel('MAPE %')
        ax4.set_title('Model Performance Metrics')
        ax4.set_xticks(x_pos)
        ax4.set_xticklabels(top_models, rotation=45)
        ax4.legend(loc='upper left')
        ax4_twin.legend(loc='upper right')
        
        plt.tight_layout()
        
        # Save plot
        plot_file = self.results_dir / f"{coin}_model_comparison.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        print(f"Comparison plot saved to: {plot_file}")
        plt.show()
    
    def generate_summary_report(self):
        """Generate overall summary report"""
        if not self.evaluation_results:
            print("No evaluation results to summarize")
            return
            
        summary = {}
        for coin, results in self.evaluation_results.items():
            if results:
                df = pd.DataFrame(results)
                best_model = df.loc[df['r2'].idxmax()]
                summary[coin] = {
                    'best_model': best_model['model'],
                    'best_r2': best_model['r2'],
                    'best_rmse': best_model['rmse'],
                    'best_mape': best_model['mape'],
                    'total_models': len(results)
                }
        
        print("\n=== OVERALL SUMMARY ===")
        summary_df = pd.DataFrame(summary).T
        print(summary_df.round(4))
        
        # Save summary
        summary_file = self.results_dir / "evaluation_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        print(f"\nSummary saved to: {summary_file}")
        
        return summary

def main():
    parser = argparse.ArgumentParser(description='Evaluate and compare ML models')
    parser.add_argument('--coin', type=str, default='btc', 
                       help='Coin to evaluate (default: btc)')
    parser.add_argument('--all-coins', action='store_true',
                       help='Evaluate all available coins')
    parser.add_argument('--models-dir', type=str, default='models',
                       help='Directory containing trained models')
    parser.add_argument('--data-dir', type=str, default='data/processed',
                       help='Directory containing processed data')
    parser.add_argument('--results-dir', type=str, default='results',
                       help='Directory to save results')
    parser.add_argument('--plot', action='store_true',
                       help='Generate comparison plots')
    
    args = parser.parse_args()
    
    # Initialize evaluator
    evaluator = ModelEvaluator(
        models_dir=args.models_dir,
        data_dir=args.data_dir,
        results_dir=args.results_dir
    )
    
    coins_to_evaluate = []
    
    if args.all_coins:
        # Find all available coins from data directory
        data_files = list(Path(args.data_dir).glob("*_ohlcv.csv"))
        coins_to_evaluate = [f.stem.replace('_ohlcv', '') for f in data_files]
        print(f"Found data for coins: {coins_to_evaluate}")
    else:
        coins_to_evaluate = [args.coin]
    
    # Evaluate models for each coin
    for coin in coins_to_evaluate:
        try:
            evaluator.evaluate_all_models(coin)
            evaluator.generate_comparison_report(coin)
            
            if args.plot:
                evaluator.plot_predictions(coin)
                
        except Exception as e:
            print(f"Error evaluating {coin}: {e}")
            continue
    
    # Generate overall summary
    if len(coins_to_evaluate) > 1:
        evaluator.generate_summary_report()
    
    print(f"\n✅ Evaluation complete! Results saved to: {args.results_dir}")

if __name__ == "__main__":
    main()