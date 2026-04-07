#!/usr/bin/env python3
"""
Batch Training Script - CoinVista ML
Run multiple training experiments with different configurations
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
import argparse
import logging
from pathlib import Path
import subprocess
import sys

# Import our comprehensive trainer
from comprehensive_training import ComprehensiveTrainer

class BatchTrainer:
    """Orchestrates multiple training experiments"""
    
    def __init__(self, config_path="training_config.json"):
        self.config_path = config_path
        self.config = self.load_config()
        self.setup_logging()
        self.results_summary = []
        
    def load_config(self):
        """Load training configuration"""
        with open(self.config_path, 'r') as f:
            return json.load(f)
    
    def setup_logging(self):
        """Setup logging configuration"""
        log_config = self.config.get('logging', {})
        
        logging.basicConfig(
            level=getattr(logging, log_config.get('level', 'INFO')),
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_config.get('log_file', 'batch_training.log')),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger(__name__)
    
    def get_data_files(self, data_dir):
        """Get all processed data files"""
        data_files = []
        
        for file_path in Path(data_dir).glob("*.csv"):
            if "processed" in str(file_path) or "ohlcv" in str(file_path):
                data_files.append(str(file_path))
        
        return data_files
    
    def create_experiment_configs(self):
        """Create different experiment configurations"""
        experiments = []
        
        # Base configuration
        base_config = {
            'optimize_params': True,
            'feature_selection_k': 30,
            'train_ratio': 0.8
        }
        
        # Experiment 1: Different target prediction days
        for target_days in self.config['training_config']['data_settings']['target_days']:
            exp_config = base_config.copy()
            exp_config.update({
                'target_days': target_days,
                'experiment_name': f'target_{target_days}d'
            })
            experiments.append(exp_config)
        
        # Experiment 2: Different feature selection methods
        for k in [20, 30, 40, 50]:
            exp_config = base_config.copy()
            exp_config.update({
                'feature_selection_k': k,
                'target_days': 1,
                'experiment_name': f'features_{k}'
            })
            experiments.append(exp_config)
        
        # Experiment 3: Different train/test splits
        for train_ratio in [0.7, 0.8, 0.85]:
            exp_config = base_config.copy()
            exp_config.update({
                'train_ratio': train_ratio,
                'target_days': 1,
                'experiment_name': f'split_{int(train_ratio*100)}'
            })
            experiments.append(exp_config)
        
        # Experiment 4: With and without optimization
        for optimize in [True, False]:
            exp_config = base_config.copy()
            exp_config.update({
                'optimize_params': optimize,
                'target_days': 1,
                'experiment_name': f'optimize_{optimize}'
            })
            experiments.append(exp_config)
        
        return experiments
    
    def run_single_experiment(self, data_file, experiment_config, output_dir):
        """Run a single training experiment"""
        coin_name = Path(data_file).stem.replace('_ohlcv', '').replace('_processed', '')
        exp_name = experiment_config['experiment_name']
        
        self.logger.info(f"Running experiment: {coin_name}_{exp_name}")
        
        # Create output directory
        exp_output_dir = os.path.join(output_dir, f"{coin_name}_{exp_name}")
        os.makedirs(exp_output_dir, exist_ok=True)
        
        try:
            # Initialize trainer with experiment config
            trainer = ComprehensiveTrainer(
                data_path=data_file,
                target_days=experiment_config.get('target_days', 1)
            )
            
            # Override feature selection if specified
            if 'feature_selection_k' in experiment_config:
                trainer.ensemble.feature_selection_k = experiment_config['feature_selection_k']
            
            # Run training
            results = trainer.train_comprehensive_model(
                optimize_params=experiment_config.get('optimize_params', True)
            )
            
            # Save models
            trainer.save_model(exp_output_dir)
            
            # Add experiment info to results
            results['experiment_config'] = experiment_config
            results['coin'] = coin_name
            results['data_file'] = data_file
            
            # Save detailed results
            results_file = os.path.join(exp_output_dir, 'detailed_results.json')
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            # Add to summary
            summary_entry = {
                'coin': coin_name,
                'experiment': exp_name,
                'r2_score': results['ensemble_metrics']['R2'],
                'rmse': results['ensemble_metrics']['RMSE'],
                'direction_accuracy': results['ensemble_metrics']['Direction_Accuracy'],
                'train_samples': results['training_info']['train_samples'],
                'test_samples': results['training_info']['test_samples'],
                'features_count': results['training_info']['features_count'],
                'target_days': results['training_info']['target_days'],
                'output_dir': exp_output_dir,
                'status': 'success'
            }
            
            self.results_summary.append(summary_entry)
            self.logger.info(f"Experiment completed successfully: R² = {results['ensemble_metrics']['R2']:.4f}")
            
            return results
            
        except Exception as e:
            self.logger.error(f"Experiment failed: {str(e)}")
            
            # Add failed experiment to summary
            summary_entry = {
                'coin': coin_name,
                'experiment': exp_name,
                'error': str(e),
                'status': 'failed'
            }
            self.results_summary.append(summary_entry)
            
            return None
    
    def run_batch_experiments(self, data_dir, output_dir):
        """Run all experiments for all data files"""
        self.logger.info("Starting batch training experiments")
        
        # Get data files
        data_files = self.get_data_files(data_dir)
        self.logger.info(f"Found {len(data_files)} data files")
        
        # Create experiment configurations
        experiments = self.create_experiment_configs()
        self.logger.info(f"Created {len(experiments)} experiment configurations")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Run experiments
        total_experiments = len(data_files) * len(experiments)
        current_experiment = 0
        
        for data_file in data_files:
            for experiment_config in experiments:
                current_experiment += 1
                self.logger.info(f"Progress: {current_experiment}/{total_experiments}")
                
                self.run_single_experiment(data_file, experiment_config, output_dir)
        
        # Save summary results
        self.save_summary_results(output_dir)
        
        self.logger.info("Batch training completed")
    
    def save_summary_results(self, output_dir):
        """Save summary of all experiments"""
        summary_file = os.path.join(output_dir, 'batch_results_summary.json')
        
        with open(summary_file, 'w') as f:
            json.dump(self.results_summary, f, indent=2, default=str)
        
        # Create CSV summary for easy analysis
        if self.results_summary:
            df_summary = pd.DataFrame(self.results_summary)
            csv_file = os.path.join(output_dir, 'batch_results_summary.csv')
            df_summary.to_csv(csv_file, index=False)
            
            # Print top performing experiments
            successful_experiments = df_summary[df_summary['status'] == 'success']
            
            if not successful_experiments.empty:
                print("\n" + "="*80)
                print("TOP PERFORMING EXPERIMENTS")
                print("="*80)
                
                # Best R² scores
                top_r2 = successful_experiments.nlargest(5, 'r2_score')
                print("\nTop 5 by R² Score:")
                for _, row in top_r2.iterrows():
                    print(f"  {row['coin']}_{row['experiment']}: R² = {row['r2_score']:.4f}, RMSE = {row['rmse']:.6f}")
                
                # Best direction accuracy
                top_direction = successful_experiments.nlargest(5, 'direction_accuracy')
                print("\nTop 5 by Direction Accuracy:")
                for _, row in top_direction.iterrows():
                    print(f"  {row['coin']}_{row['experiment']}: Accuracy = {row['direction_accuracy']:.4f}, R² = {row['r2_score']:.4f}")
                
                # Summary statistics
                print(f"\nSummary Statistics:")
                print(f"  Total experiments: {len(self.results_summary)}")
                print(f"  Successful: {len(successful_experiments)}")
                print(f"  Failed: {len(self.results_summary) - len(successful_experiments)}")
                print(f"  Average R²: {successful_experiments['r2_score'].mean():.4f}")
                print(f"  Average RMSE: {successful_experiments['rmse'].mean():.6f}")
                print(f"  Average Direction Accuracy: {successful_experiments['direction_accuracy'].mean():.4f}")
        
        self.logger.info(f"Summary results saved to {summary_file}")

class QuickTrainer:
    """Quick training for single coin with best practices"""
    
    def __init__(self):
        pass
    
    def train_single_coin(self, data_file, output_dir, target_days=1, quick_mode=False):
        """Train a single coin with optimized settings"""
        print(f"Training single coin: {data_file}")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize trainer
        trainer = ComprehensiveTrainer(data_file, target_days)
        
        # Train model (skip optimization in quick mode)
        results = trainer.train_comprehensive_model(optimize_params=not quick_mode)
        
        # Save model
        trainer.save_model(output_dir)
        
        print(f"Training completed. Models saved to: {output_dir}")
        print(f"Final R² Score: {results['ensemble_metrics']['R2']:.4f}")
        print(f"Final RMSE: {results['ensemble_metrics']['RMSE']:.6f}")
        print(f"Direction Accuracy: {results['ensemble_metrics']['Direction_Accuracy']:.4f}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Batch Training for Cryptocurrency Price Prediction')
    parser.add_argument('--mode', choices=['batch', 'single'], default='single',
                       help='Training mode: batch (all experiments) or single (one coin)')
    parser.add_argument('--data-dir', default='../data/processed',
                       help='Directory containing processed data files')
    parser.add_argument('--data-file', help='Single data file for single mode')
    parser.add_argument('--output-dir', default='../models/batch_results',
                       help='Output directory for models and results')
    parser.add_argument('--target-days', type=int, default=1,
                       help='Days ahead to predict (single mode only)')
    parser.add_argument('--quick', action='store_true',
                       help='Quick mode: skip hyperparameter optimization')
    parser.add_argument('--config', default='training_config.json',
                       help='Path to training configuration file')
    
    args = parser.parse_args()
    
    if args.mode == 'batch':
        # Batch training mode
        batch_trainer = BatchTrainer(args.config)
        batch_trainer.run_batch_experiments(args.data_dir, args.output_dir)
        
    else:
        # Single training mode
        if not args.data_file:
            print("Error: --data-file is required for single mode")
            return
        
        quick_trainer = QuickTrainer()
        quick_trainer.train_single_coin(
            args.data_file, 
            args.output_dir, 
            args.target_days,
            args.quick
        )

if __name__ == "__main__":
    main()