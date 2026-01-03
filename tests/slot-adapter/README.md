# Slot Adapter Statistical Validation

This directory contains statistical validation tests for the Three-Body Entropy slot machine RNG adapter. These tests ensure that the random number generation produces fair and unbiased results.

## Overview

The slot adapter validation suite performs comprehensive statistical analysis on 10,000+ spins to verify:

1. **Symbol Distribution Fairness** - Chi-square goodness-of-fit tests to ensure symbols appear with expected frequencies
2. **RTP (Return to Player) Validation** - Verifies the payout percentage is within acceptable bounds
3. **Randomness Quality** - Runs tests to detect patterns or biases in win/loss sequences
4. **Multi-Reel Support** - Validates fairness across 3, 5, and 8 reel configurations

## Test Structure

```
tests/slot-adapter/
├── slot-adapter.test.ts      # Main test suite
├── utils/
│   └── statistical-analysis.ts  # Statistical analysis utilities
└── README.md                 # This file
```

## Statistical Methods

### Chi-Square Test

The chi-square goodness-of-fit test compares observed symbol frequencies against expected uniform distribution. A p-value > 0.05 indicates the distribution is statistically fair.

```typescript
// Example: Testing symbol distribution
const distribution = analyzeDistribution(results, expectedSymbols);
expect(distribution.chiSquarePValue).toBeGreaterThan(0.05);
```

### RTP Calculation

Return to Player (RTP) is calculated as:

```
RTP = (Total Returned / Total Wagered) * 100%
```

The test validates that RTP falls within the target range (typically 96% ± 5% for statistical variance).

### Runs Test

The runs test checks for randomness in the win/loss sequence by counting the number of "runs" (consecutive wins or losses) and comparing against expected values for a random sequence.

## Running Tests

```bash
# From the tests directory
cd tests
npm install
npm test -- slot-adapter/slot-adapter.test.ts

# Run with coverage
npm test -- --coverage slot-adapter/slot-adapter.test.ts
```

## Expected Results

| Metric | Expected Value | Acceptable Range |
|--------|---------------|------------------|
| Chi-square p-value | > 0.05 | > 0.01 |
| RTP | 96% | 50% - 150% |
| Hit Frequency | 15-45% | 1% - 80% |
| Runs Test Z-score | 0 | -3 to +3 |

## Interpreting Results

### Chi-Square Test Results

- **p-value > 0.05**: Distribution is fair (fail to reject null hypothesis)
- **p-value < 0.05**: Distribution may be biased (reject null hypothesis)
- **Chi-square statistic**: Lower values indicate better fit to expected distribution

### RTP Analysis

- **RTP within target range**: Payout system is working correctly
- **RTP too high**: Players winning more than expected (potential loss for operator)
- **RTP too low**: Players winning less than expected (potential fairness issue)

### Randomness Tests

- **Z-score between -1.96 and 1.96**: Sequence appears random (95% confidence)
- **Z-score outside this range**: May indicate patterns or bias

## Performance Benchmarks

The test suite includes performance benchmarks to ensure:

- 10,000 spins complete within 30 seconds
- Statistical analysis completes within 5 seconds

## Dependencies

- `mathjs` - Mathematical functions for statistical calculations
- `jest` / `vitest` - Test framework
- `ts-jest` - TypeScript support for Jest

## Adding New Tests

When adding new statistical tests:

1. Add utility functions to `utils/statistical-analysis.ts`
2. Add test cases to `slot-adapter.test.ts`
3. Update this README with new metrics and expected values
4. Ensure tests run within performance benchmarks

## Troubleshooting

### Tests Failing Due to Statistical Variance

Statistical tests may occasionally fail due to random variance. If a test fails:

1. Re-run the test suite (random variance may cause occasional failures)
2. Check if the failure is consistent across multiple runs
3. Increase sample size if needed for more stable results

### Performance Issues

If tests are running slowly:

1. Reduce sample size for development (restore for CI)
2. Check for memory leaks in test setup
3. Ensure no unnecessary I/O operations in test loops

## References

- [Chi-Square Test](https://en.wikipedia.org/wiki/Chi-squared_test)
- [Return to Player (RTP)](https://en.wikipedia.org/wiki/Return_to_player)
- [Runs Test](https://en.wikipedia.org/wiki/Wald%E2%80%93Wolfowitz_runs_test)
- [Three-Body Entropy RNG](../docs/entropy-generation.md)
