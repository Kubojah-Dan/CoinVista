#!/usr/bin/env python3
"""
Comprehensive Training Script - CoinVista ML
Combines all optimization techniques for maximum accuracy
"""

import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.svm import SVR
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.feature_selection import SelectKBest, f_regression, RFE
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostRegressor

import ta
from scipy import stats
from scipy.signal import savgol_filter
import joblib
import json
import os
from datetime import datetime, timedelta
import argparse

class AdvancedFeatureEngineer:
    """Advanced feature engineering with 50+ technical indicators"""
    
    def __init__(self):
        self.scalers = {}
        
    def create_technical_features(self, df):
        """Create comprehensive technical indicators"""
        data = df.copy()
        
        # Price-based indicators
        data['sma_5'] = ta.trend.sma_indicator(data['close'], window=5)
        data['sma_10'] = ta.trend.sma_indicator(data['close'], window=10)
        data['sma_20'] = ta.trend.sma_indicator(data['close'], window=20)
        data['sma_50'] = ta.trend.sma_indicator(data['close'], window=50)
        data['ema_12'] = ta.trend.ema_indicator(data['close'], window=12)
        data['ema_26'] = ta.trend.ema_indicator(data['close'], window=26)
        
        # Momentum indicators
        data['rsi_14'] = ta.momentum.rsi(data['close'], window=14)
        data['rsi_21'] = ta.momentum.rsi(data['close'], window=21)
        data['macd'] = ta.trend.macd_diff(data['close'])
        data['macd_signal'] = ta.trend.macd_signal(data['close'])
        data['stoch_k'] = ta.momentum.stoch(data['high'], data['low'], data['close'])
        data['stoch_d'] = ta.momentum.stoch_signal(data['high'], data['low'], data['close'])
        data['williams_r'] = ta.momentum.williams_r(data['high'], data['low'], data['close'])
        data['roc'] = ta.momentum.roc(data['close'], window=10)
        
        # Volatility indicators
        data['bb_upper'] = ta.volatility.bollinger_hband(data['close'])
        data['bb_middle'] = ta.volatility.bollinger_mavg(data['close'])
        data['bb_lower'] = ta.volatility.bollinger_lband(data['close'])
        data['atr'] = ta.volatility.average_true_range(data['high'], data['low'], data['close'])
        
        # Volume indicators
        data['obv'] = ta.volume.on_balance_volume(data['close'], data['volume'])
        data['ad'] = ta.volume.acc_dist_index(data['high'], data['low'], data['close'], data['volume'])
        
        return data
    
    def create_statistical_features(self, df):
        """Create statistical and mathematical features"""
        data = df.copy()
        
        # Returns and log returns
        data['returns'] = data['close'].pct_change()
        data['log_returns'] = np.log(data['close'] / data['close'].shift(1))
        data['returns_2'] = data['returns'].shift(1)
        data['returns_3'] = data['returns'].shift(2)
        
        # Rolling statistics
        for window in [5, 10, 20, 30]:
            data[f'volatility_{window}'] = data['returns'].rolling(window).std()
            data[f'skew_{window}'] = data['returns'].rolling(window).skew()
            data[f'kurt_{window}'] = data['returns'].rolling(window).kurt()
            data[f'volume_sma_{window}'] = data['volume'].rolling(window).mean()
            data[f'price_range_{window}'] = (data['high'] - data['low']).rolling(window).mean()
        
        # Price position indicators
        data['price_position'] = (data['close'] - data['low']) / (data['high'] - data['low'])
        data['gap'] = data['open'] - data['close'].shift(1)
        data['gap_pct'] = data['gap'] / data['close'].shift(1)
        
        # Trend indicators
        data['trend_5'] = np.where(data['close'] > data['sma_5'], 1, 0)
        data['trend_20'] = np.where(data['close'] > data['sma_20'], 1, 0)
        data['sma_ratio'] = data['sma_5'] / data['sma_20']
        
        return data
    
    def create_lag_features(self, df, lags=[1, 2, 3, 5, 7, 14]):
        """Create lagged features"""
        data = df.copy()
        
        for lag in lags:
            data[f'close_lag_{lag}'] = data['close'].shift(lag)
            data[f'volume_lag_{lag}'] = data['volume'].shift(lag)
            data[f'returns_lag_{lag}'] = data['returns'].shift(lag)
            data[f'rsi_lag_{lag}'] = data['rsi_14'].shift(lag)
        
        return data
    
    def create_interaction_features(self, df):
        """Create interaction and polynomial features"""
        data = df.copy()
        
        # Price-volume interactions
        data['price_volume'] = data['close'] * data['volume']
        data['volume_price_ratio'] = data['volume'] / data['close']
        
        # Technical indicator interactions
        data['rsi_macd'] = data['rsi_14'] * data['macd']
        data['bb_position'] = (data['close'] - data['bb_lower']) / (data['bb_upper'] - data['bb_lower'])
        
        # Polynomial features for key indicators
        data['rsi_squared'] = data['rsi_14'] ** 2
        data['returns_squared'] = data['returns'] ** 2
        
        return data
    
    def engineer_features(self, df):
        """Complete feature engineering pipeline"""
        print("Starting feature engineering...")
        
        # Ensure required columns exist
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in data")
        
        # Apply all feature engineering steps
        data = self.create_technical_features(df)
        data = self.create_statistical_features(data)
        data = self.create_lag_features(data)
        data = self.create_interaction_features(data)
        
        # Remove rows with NaN values
        initial_rows = len(data)
        data = data.dropna()
        print(f"Removed {initial_rows - len(data)} rows with NaN values")
        
        return data

class ModelEnsemble:
    """Advanced ensemble of multiple ML models"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_selector = None
        self.ensemble_weights = {}
        
    def create_base_models(self):
        """Create diverse base models with optimized hyperparameters"""
        models = {
            'rf': RandomForestRegressor(
                n_estimators=200, max_depth=15, min_samples_split=5,
                min_samples_leaf=2, random_state=42, n_jobs=-1
            ),
            'gb': GradientBoostingRegressor(
                n_estimators=150, learning_rate=0.1, max_depth=8,
                min_samples_split=5, random_state=42
            ),
            'xgb': xgb.XGBRegressor(
                n_estimators=200, learning_rate=0.1, max_depth=8,
                subsample=0.8, colsample_bytree=0.8, random_state=42
            ),
            'lgb': lgb.LGBMRegressor(
                n_estimators=200, learning_rate=0.1, max_depth=8,
                num_leaves=31, subsample=0.8, random_state=42, verbose=-1
            ),
            'catboost': CatBoostRegressor(
                iterations=200, learning_rate=0.1, depth=8,
                random_seed=42, verbose=False
            ),
            'ridge': Ridge(alpha=1.0),
            'lasso': Lasso(alpha=0.1),
            'elastic': ElasticNet(alpha=0.1, l1_ratio=0.5),
            'svr': SVR(kernel='rbf', C=100, gamma='scale'),
            'mlp': MLPRegressor(
                hidden_layer_sizes=(100, 50), max_iter=500,
                random_state=42, early_stopping=True
            )
        }
        return models
    
    def optimize_hyperparameters(self, X, y, model_name, model):
        """Optimize hyperparameters using GridSearchCV"""
        print(f"Optimizing {model_name}...")
        
        param_grids = {
            'rf': {
                'n_estimators': [100, 200],
                'max_depth': [10, 15, 20],
                'min_samples_split': [2, 5]
            },
            'xgb': {
                'n_estimators': [100, 200],
                'learning_rate': [0.05, 0.1, 0.15],
                'max_depth': [6, 8, 10]
            },
            'lgb': {
                'n_estimators': [100, 200],
                'learning_rate': [0.05, 0.1, 0.15],
                'num_leaves': [31, 50, 70]
            }
        }
        
        if model_name in param_grids:
            tscv = TimeSeriesSplit(n_splits=3)
            grid_search = GridSearchCV(
                model, param_grids[model_name], cv=tscv,
                scoring='neg_mean_squared_error', n_jobs=-1
            )
            grid_search.fit(X, y)
            return grid_search.best_estimator_
        
        return model
    
    def feature_selection(self, X, y, k=30):
        """Select top k features using multiple methods"""
        print(f"Selecting top {k} features...")
        
        # Statistical feature selection
        selector_stats = SelectKBest(score_func=f_regression, k=k)
        X_selected_stats = selector_stats.fit_transform(X, y)
        
        # Recursive feature elimination with Random Forest
        rf_selector = RandomForestRegressor(n_estimators=50, random_state=42)
        selector_rfe = RFE(rf_selector, n_features_to_select=k)
        X_selected_rfe = selector_rfe.fit_transform(X, y)
        
        # Combine both methods (intersection)
        stats_features = selector_stats.get_support()
        rfe_features = selector_rfe.get_support()
        combined_features = stats_features & rfe_features
        
        # If intersection is too small, use union
        if np.sum(combined_features) < k // 2:
            combined_features = stats_features | rfe_features
        
        self.feature_selector = combined_features
        return X[:, combined_features]
    
    def train_ensemble(self, X, y, optimize_params=True):
        """Train ensemble of models"""
        print("Training ensemble models...")
        
        # Feature selection
        X_selected = self.feature_selection(X, y)
        
        # Create and train models
        base_models = self.create_base_models()
        trained_models = {}
        model_scores = {}
        
        # Time series cross-validation
        tscv = TimeSeriesSplit(n_splits=5)
        
        for name, model in base_models.items():
            print(f"Training {name}...")
            
            # Scale features for certain models
            if name in ['ridge', 'lasso', 'elastic', 'svr', 'mlp']:
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X_selected)
                self.scalers[name] = scaler
            else:
                X_scaled = X_selected
                self.scalers[name] = None
            
            # Optimize hyperparameters
            if optimize_params and name in ['rf', 'xgb', 'lgb']:
                model = self.optimize_hyperparameters(X_scaled, y, name, model)
            
            # Train model
            model.fit(X_scaled, y)
            trained_models[name] = model
            
            # Cross-validation score
            cv_scores = cross_val_score(model, X_scaled, y, cv=tscv, scoring='neg_mean_squared_error')
            model_scores[name] = -cv_scores.mean()
            print(f"{name} CV MSE: {model_scores[name]:.6f}")
        
        self.models = trained_models
        
        # Calculate ensemble weights based on performance
        total_score = sum(1/score for score in model_scores.values())
        self.ensemble_weights = {name: (1/score)/total_score for name, score in model_scores.items()}
        
        print("Ensemble weights:", {k: f"{v:.3f}" for k, v in self.ensemble_weights.items()})
        
        return self.models
    
    def predict(self, X):
        """Make ensemble predictions"""
        if self.feature_selector is not None:
            X_selected = X[:, self.feature_selector]
        else:
            X_selected = X
        
        predictions = {}
        
        for name, model in self.models.items():
            # Apply scaling if needed
            if self.scalers[name] is not None:
                X_scaled = self.scalers[name].transform(X_selected)
            else:
                X_scaled = X_selected
            
            predictions[name] = model.predict(X_scaled)
        
        # Weighted ensemble prediction
        ensemble_pred = np.zeros(len(X_selected))
        for name, pred in predictions.items():
            ensemble_pred += self.ensemble_weights[name] * pred
        
        return ensemble_pred, predictions

class ComprehensiveTrainer:
    """Main training class that orchestrates the entire process"""
    
    def __init__(self, data_path, target_days=1):
        self.data_path = data_path
        self.target_days = target_days
        self.feature_engineer = AdvancedFeatureEngineer()
        self.ensemble = ModelEnsemble()
        self.results = {}
        
    def load_and_prepare_data(self):
        """Load and prepare data for training"""
        print(f"Loading data from {self.data_path}")
        
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Data file not found: {self.data_path}")
        
        # Load data
        df = pd.read_csv(self.data_path)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        print(f"Loaded {len(df)} rows of data")
        print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        
        return df
    
    def create_targets(self, df):
        """Create prediction targets"""
        data = df.copy()
        
        # Future price targets
        data[f'target_{self.target_days}d'] = data['close'].shift(-self.target_days)
        data[f'target_return_{self.target_days}d'] = (
            data[f'target_{self.target_days}d'] / data['close'] - 1
        )
        
        # Remove rows without targets
        data = data.dropna()
        
        return data
    
    def split_data(self, df, train_ratio=0.8):
        """Split data maintaining temporal order"""
        split_idx = int(len(df) * train_ratio)
        
        train_data = df.iloc[:split_idx].copy()
        test_data = df.iloc[split_idx:].copy()
        
        print(f"Train set: {len(train_data)} rows")
        print(f"Test set: {len(test_data)} rows")
        
        return train_data, test_data
    
    def evaluate_model(self, y_true, y_pred, model_name="Model"):
        """Comprehensive model evaluation"""
        mse = mean_squared_error(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_true, y_pred)
        
        # Direction accuracy
        y_true_direction = np.sign(y_true)
        y_pred_direction = np.sign(y_pred)
        direction_accuracy = np.mean(y_true_direction == y_pred_direction)
        
        metrics = {
            'MSE': mse,
            'MAE': mae,
            'RMSE': rmse,
            'R2': r2,
            'Direction_Accuracy': direction_accuracy
        }
        
        print(f"\n{model_name} Performance:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.6f}")
        
        return metrics
    
    def train_comprehensive_model(self, optimize_params=True):
        """Complete training pipeline"""
        print("=" * 60)
        print("COMPREHENSIVE CRYPTOCURRENCY PRICE PREDICTION TRAINING")
        print("=" * 60)
        
        # Load and prepare data
        df = self.load_and_prepare_data()
        
        # Feature engineering
        df_features = self.feature_engineer.engineer_features(df)
        
        # Create targets
        df_targets = self.create_targets(df_features)
        
        # Prepare features and targets
        feature_cols = [col for col in df_targets.columns 
                       if col not in ['timestamp', f'target_{self.target_days}d', f'target_return_{self.target_days}d']]
        
        X = df_targets[feature_cols].values
        y = df_targets[f'target_return_{self.target_days}d'].values
        
        print(f"Features shape: {X.shape}")
        print(f"Target shape: {y.shape}")
        
        # Split data
        train_data, test_data = self.split_data(df_targets)
        
        X_train = train_data[feature_cols].values
        y_train = train_data[f'target_return_{self.target_days}d'].values
        X_test = test_data[feature_cols].values
        y_test = test_data[f'target_return_{self.target_days}d'].values
        
        # Train ensemble
        self.ensemble.train_ensemble(X_train, y_train, optimize_params=optimize_params)
        
        # Make predictions
        y_pred_ensemble, individual_preds = self.ensemble.predict(X_test)
        
        # Evaluate ensemble
        ensemble_metrics = self.evaluate_model(y_test, y_pred_ensemble, "Ensemble")
        
        # Evaluate individual models
        individual_metrics = {}
        for name, pred in individual_preds.items():
            metrics = self.evaluate_model(y_test, pred, name)
            individual_metrics[name] = metrics
        
        # Store results
        self.results = {
            'ensemble_metrics': ensemble_metrics,
            'individual_metrics': individual_metrics,
            'feature_columns': feature_cols,
            'ensemble_weights': self.ensemble.ensemble_weights,
            'training_info': {
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'features_count': X.shape[1],
                'target_days': self.target_days,
                'data_path': self.data_path
            }
        }
        
        return self.results
    
    def save_model(self, save_dir):
        """Save trained models and metadata"""
        os.makedirs(save_dir, exist_ok=True)
        
        # Save ensemble models
        model_path = os.path.join(save_dir, 'ensemble_models.joblib')
        joblib.dump({
            'models': self.ensemble.models,
            'scalers': self.ensemble.scalers,
            'feature_selector': self.ensemble.feature_selector,
            'ensemble_weights': self.ensemble.ensemble_weights
        }, model_path)
        
        # Save feature engineering pipeline
        fe_path = os.path.join(save_dir, 'feature_engineer.joblib')
        joblib.dump(self.feature_engineer, fe_path)
        
        # Save results and metadata
        results_path = os.path.join(save_dir, 'training_results.json')
        with open(results_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"Models saved to {save_dir}")
        return save_dir

def main():
    parser = argparse.ArgumentParser(description='Comprehensive Cryptocurrency Price Prediction Training')
    parser.add_argument('--data', required=True, help='Path to processed data CSV file')
    parser.add_argument('--target-days', type=int, default=1, help='Days ahead to predict (default: 1)')
    parser.add_argument('--save-dir', default='../models/comprehensive', help='Directory to save models')
    parser.add_argument('--no-optimize', action='store_true', help='Skip hyperparameter optimization')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = ComprehensiveTrainer(args.data, args.target_days)
    
    # Train comprehensive model
    results = trainer.train_comprehensive_model(optimize_params=not args.no_optimize)
    
    # Save models
    trainer.save_model(args.save_dir)
    
    # Print summary
    print("\n" + "=" * 60)
    print("TRAINING COMPLETE - SUMMARY")
    print("=" * 60)
    print(f"Best Ensemble R²: {results['ensemble_metrics']['R2']:.6f}")
    print(f"Best Ensemble RMSE: {results['ensemble_metrics']['RMSE']:.6f}")
    print(f"Direction Accuracy: {results['ensemble_metrics']['Direction_Accuracy']:.6f}")
    print(f"Models saved to: {args.save_dir}")

if __name__ == "__main__":
    main()