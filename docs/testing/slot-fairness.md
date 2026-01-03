# Slot Machine Fairness Testing Documentation

This document describes the statistical validation methodology used to ensure the Three-Body Entropy slot machine produces fair and unbiased results.

## Overview

The slot machine fairness testing suite validates that the RNG (Random Number Generator) adapter produces statistically fair results. This is critical for regulatory compliance and player trust.

## Key Metrics

### Expected RTP (Return to Player)

The target RTP for the slot machine is **96%** with an acceptable tolerance of **±5%** for statistical variance in testing.

| Configuration | Target RTP | Acceptable Range |
|--------------|-----------|------------------|
| 3-Reel | 96% | 91% - 101% |
| 5-Reel | 96% | 91% - 101% |
| 8-Reel | 96% | 91% - 101% |

### Symbol Probabilities

All symbols have equal probability of appearing on each reel position. With 8 symbols and 20 positions per reel:

| Symbol | Expected Frequency | Probability |
|--------|-------------------|-------------|
| Cherry | 12.5% | 1/8 |
| Lemon | 12.5% | 1/8 |
| Orange | 12.5% | 1/8 |
| Plum | 12.5% | 1/8 |
| Bell | 12.5% | 1/8 |
| Bar | 12.5% | 1/8 |
| Seven | 12.5% | 1/8 |
| Diamond | 12.5% | 1/8 |

### Symbol Payouts

| Symbol | Value Multiplier |
|--------|-----------------|
| Cherry | 1x |
| Lemon | 2x |
| Orange | 3x |
| Plum | 4x |
| Bell | 5x |
| Bar | 10x |
| Seven | 20x |
| Diamond | 50x |

## Statistical Tests

### Chi-Square Goodness-of-Fit Test

The chi-square test validates that symbol distribution matches expected uniform distribution.

**Methodology:**
1. Collect symbol frequencies from 10,000+ spins
2. Calculate expected frequency (total symbols / number of unique symbols)
3. Compute chi-square statistic: χ² = Σ((O - E)² / E)
4. Compare against critical value at α = 0.05

**Interpretation:**
- **p-value > 0.05**: Distribution is fair (null hypothesis not rejected)
- **p-value < 0.05**: Distribution may be biased (null hypothesis rejected)

**Example Output:**
```
Chi-square statistic: 5.234
Degrees of freedom: 7
p-value: 0.632
Result: PASS (distribution is fair)
```

### RTP Calculation

Return to Player is calculated as the ratio of total returns to total wagers.

**Formula:**
```
RTP = (Total Returned / Total Wagered) × 100%
```

**Confidence Interval:**
The 95% confidence interval is calculated using:
```
CI = RTP ± (1.96 × Standard Error)
```

Where Standard Error = σ / √n

### Runs Test for Randomness

The Wald-Wolfowitz runs test checks for patterns in win/loss sequences.

**Methodology:**
1. Convert spin results to binary sequence (win = 1, loss = 0)
2. Count number of "runs" (consecutive same values)
3. Calculate expected runs and variance
4. Compute Z-score

**Interpretation:**
- **|Z| < 1.96**: Sequence appears random (95% confidence)
- **|Z| > 1.96**: Sequence may have patterns

## Running the Tests

### Prerequisites

```bash
cd tests
npm install
```

### Run All Fairness Tests

```bash
npm test -- slot-adapter/slot-adapter.test.ts
```

### Run Specific Test Categories

```bash
# RTP tests only
npm test -- slot-adapter/slot-adapter.test.ts --testNamePattern="RTP"

# Distribution tests only
npm test -- slot-adapter/slot-adapter.test.ts --testNamePattern="Distribution"

# Performance benchmarks
npm test -- slot-adapter/slot-adapter.test.ts --testNamePattern="Performance"
```

### Run with Coverage

```bash
npm test -- --coverage slot-adapter/slot-adapter.test.ts
```

## CI/CD Integration

The slot fairness tests are automatically run on:
- All pull requests to `main` branch
- All pushes to `devin/**` branches

### CI Workflow

The `.github/workflows/slot-fairness.yml` workflow includes:

1. **Statistical Fairness Tests** - Full test suite on Node.js 18.x and 20.x
2. **RTP Validation** - Focused RTP range validation
3. **Distribution Validation** - Symbol distribution chi-square tests
4. **Performance Benchmarks** - Timing validation for 10,000 spins

### Failure Criteria

The CI pipeline will fail if:
- Chi-square p-value < 0.01 (severe distribution bias)
- RTP outside 50% - 150% range (extreme deviation)
- 10,000 spins take longer than 30 seconds
- Statistical analysis takes longer than 5 seconds

## Interpreting Test Results

### Successful Test Output

```
PASS tests/slot-adapter/slot-adapter.test.ts
  Slot Adapter Statistical Validation
    Symbol Distribution Fairness
      ✓ produces fair symbol distribution over 10,000 spins (1234 ms)
      ✓ maintains consistent distribution across all reel positions (567 ms)
    RTP (Return to Player) Validation
      ✓ RTP is within acceptable range over 10,000 spins (890 ms)
      ✓ RTP converges with increasing sample size (1234 ms)
    Randomness Quality
      ✓ win/loss sequence passes runs test for randomness (456 ms)
      ✓ produces unique results for different client seeds (123 ms)
```

### Common Failure Scenarios

**1. Chi-Square Test Failure**
```
Expected: chiSquarePValue > 0.05
Received: 0.023
```
This indicates potential bias in symbol distribution. Investigate the RNG implementation.

**2. RTP Out of Range**
```
Expected: rtp > 50 and rtp < 150
Received: 45.2
```
This indicates the payout calculation may be incorrect. Review win calculation logic.

**3. Runs Test Failure**
```
Expected: |zScore| < 3
Received: 3.45
```
This indicates potential patterns in the random sequence. Review entropy generation.

## Regulatory Compliance

These tests help ensure compliance with common gaming regulations:

- **GLI-11** (Gaming Laboratories International) - RNG testing standards
- **eCOGRA** - Fair gaming certification requirements
- **Malta Gaming Authority** - Technical standards for RNG

### Audit Trail

All test results are logged with:
- Timestamp
- Sample size
- Statistical metrics
- Pass/fail status

## Troubleshooting

### Intermittent Test Failures

Statistical tests may occasionally fail due to random variance. If a test fails:

1. Re-run the test suite 2-3 times
2. If failures persist, investigate the specific metric
3. Consider increasing sample size for more stable results

### Performance Issues

If tests are running slowly:

1. Check system resources (CPU, memory)
2. Ensure no other heavy processes are running
3. Consider running tests in isolation

### Memory Issues

For large sample sizes:

1. Monitor memory usage during tests
2. Consider streaming results instead of storing all in memory
3. Use garbage collection hints if needed

## References

- [Chi-Square Distribution Tables](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm)
- [GLI-11 RNG Standards](https://gaminglabs.com/gli-standards/)
- [Three-Body Problem Entropy](https://en.wikipedia.org/wiki/Three-body_problem)
- [Provably Fair Gaming](https://en.wikipedia.org/wiki/Provably_fair)
