/**
 * Run All Examples
 * 
 * Executes all slot machine examples and displays a summary.
 */

import { run3ReelExample } from './three-reel';
import { run8ReelExample } from './eight-reel';
import { ExampleResult } from '../types';

/**
 * Runs all examples.
 */
export async function runAllExamples(): Promise<void> {
  console.log('\n');
  console.log('#'.repeat(70));
  console.log('#  THREE-BODY ENTROPY SLOT MACHINE - ALL EXAMPLES');
  console.log('#'.repeat(70));
  console.log('\n');
  
  const results: { name: string; result: ExampleResult }[] = [];
  
  // Run 3-reel example
  console.log('Running 3-reel example...\n');
  try {
    const result3 = await run3ReelExample();
    results.push({ name: '3-Reel Classic', result: result3 });
  } catch (error) {
    console.error('3-reel example failed:', error);
  }
  
  console.log('\n');
  
  // Run 8-reel example
  console.log('Running 8-reel example...\n');
  try {
    const result8 = await run8ReelExample();
    results.push({ name: '8-Reel Cosmic', result: result8 });
  } catch (error) {
    console.error('8-reel example failed:', error);
  }
  
  // Summary
  console.log('\n');
  console.log('#'.repeat(70));
  console.log('#  EXAMPLES SUMMARY');
  console.log('#'.repeat(70));
  console.log('\n');
  
  for (const { name, result } of results) {
    console.log(`${name}:`);
    console.log(`  Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`  Spins: ${result.totalSpins}`);
    console.log(`  Wins: ${result.totalWins}`);
    console.log(`  Final Balance: $${result.finalBalance}`);
    console.log(`  Execution Time: ${result.executionTime}ms`);
    console.log('');
  }
  
  const totalSpins = results.reduce((sum, r) => sum + r.result.totalSpins, 0);
  const totalWins = results.reduce((sum, r) => sum + r.result.totalWins, 0);
  const totalTime = results.reduce((sum, r) => sum + r.result.executionTime, 0);
  
  console.log('-'.repeat(40));
  console.log(`Total Examples: ${results.length}`);
  console.log(`Total Spins: ${totalSpins}`);
  console.log(`Total Wins: ${totalWins}`);
  console.log(`Total Execution Time: ${totalTime}ms`);
  console.log('#'.repeat(70));
}

// Run if executed directly
if (require.main === module) {
  runAllExamples()
    .then(() => {
      console.log('\nAll examples completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Examples failed:', error);
      process.exit(1);
    });
}
