const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calculateRecipe,
    getTempActivityRate,
    getEquivalentHours,
    getBigaPhase1Factor,
    getSaltFactor
} = require('../js/calculator.js');
const { computeStartTime } = require('../js/schedule.js');

test('temperature activity curve handles dormancy, doubling, and heat cap', () => {
    assert.equal(getTempActivityRate(0), 0);
    assert.equal(getTempActivityRate(-2), 0);
    assert.equal(getTempActivityRate(21), 1);
    assert.equal(getTempActivityRate(29), 2);
    assert.equal(getTempActivityRate(38), getTempActivityRate(33));

    // Steady 4°C fridge rate should be ~0.06x (1.4 eq-h per 24h)
    const rate4 = getTempActivityRate(4);
    assert.ok(rate4 > 0.04 && rate4 < 0.08, `Expected ~0.06 at 4°C, got ${rate4}`);

    // Strictly increasing across 0°C -> 33°C
    assert.ok(getTempActivityRate(1) < getTempActivityRate(4));
    assert.ok(getTempActivityRate(4) < getTempActivityRate(10));
    assert.ok(getTempActivityRate(10) < getTempActivityRate(12));
    assert.ok(getTempActivityRate(12) < getTempActivityRate(21));
});

test('thermal transitions apply cool-down and warm-up lag smoothly', () => {
    // Entering 4°C fridge from 21°C gives more eq-hours than steady 4°C
    const steadyCold = getEquivalentHours(24, 4, 4);
    const coolDownCold = getEquivalentHours(24, 4, 21);
    assert.ok(coolDownCold > steadyCold);

    // Warming from 4°C to 21°C gives fewer eq-hours than already-warm 21°C
    const steadyWarm = getEquivalentHours(6, 21, 21);
    const warmUp = getEquivalentHours(6, 21, 4);
    assert.ok(warmUp < steadyWarm);

    // No discontinuity between 10°C and 11°C when cooling from 21°C
    const at10 = getEquivalentHours(24, 10, 21);
    const at11 = getEquivalentHours(24, 11, 21);
    assert.ok(at11 > at10 && at11 - at10 < 1.5);

    // Skipping Phase 1 (dur1 = 0) should NOT apply a warm-up lag to Phase 2
    const directNoFridge = calculateRecipe({
        useBiga: false,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        temp1: 4,
        dur1: 0,
        temp2: 21,
        dur2: 8
    });
    assert.equal(directNoFridge.totalEqHours, 8);
});

test('default Biga recipe after Step 2.3 power-law curve', () => {
    const res = calculateRecipe({
        useBiga: true,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        bigaPercent: 80,
        bigaHydration: 50,
        temp1: 21,
        dur1: 12,
        temp2: 4,
        dur2: 24,
        temp3: 21,
        dur3: 8,
        yeastType: 'idy'
    });

    assert.equal(res.error, undefined);
    assert.equal(res.totalDough, 810);
    assert.equal(res.biga.flour.toFixed(1), '390.4');
    assert.equal(res.biga.water.toFixed(1), '195.2');
    assert.equal(res.biga.remFlour.toFixed(1), '97.6');
    assert.equal(res.biga.remWater.toFixed(1), '112.2');
    assert.equal(res.totalSalt.toFixed(1), '14.6');
    assert.equal(res.yeastGrams.toFixed(2), '0.16');
    assert.equal(res.yeastLabel, 'IDY');
});

test('default Direct recipe after Step 2.3 power-law curve', () => {
    const res = calculateRecipe({
        useBiga: false,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        temp1: 4,
        dur1: 24,
        temp2: 21,
        dur2: 8,
        yeastType: 'idy'
    });

    assert.equal(res.error, undefined);
    assert.equal(res.totalFlour.toFixed(1), '488.0');
    assert.equal(res.totalWater.toFixed(1), '307.4');
    assert.equal(res.totalSalt.toFixed(1), '14.6');
    assert.equal(res.yeastGrams.toFixed(2), '0.45');
});

test('power-law curve scales super-linearly between short and long RT ferments', () => {
    const base = {
        useBiga: false,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        temp1: 4,
        dur1: 0,
        temp2: 21
    };
    const r4 = calculateRecipe({ ...base, dur2: 4 });
    const r8 = calculateRecipe({ ...base, dur2: 8 });
    const r24 = calculateRecipe({ ...base, dur2: 24 });

    // Halving time from 8h -> 4h should require >3x yeast (not 2x)
    assert.ok(r4.idyPercent / r8.idyPercent > 3.0);
    // 24h RT should land around ~0.02% IDY
    assert.ok(r24.idyPercent > 0.018 && r24.idyPercent < 0.024);
});

test('Step 2.4 scales yeast for salt inhibition and biga percentage', () => {
    // Anchors unchanged at defaults (3% salt, 80% biga)
    assert.equal(getSaltFactor(3), 1);
    assert.ok(Math.abs(getBigaPhase1Factor(80) - 0.7) < 1e-9);

    // Lower salt needs less yeast; higher salt needs more
    assert.ok(getSaltFactor(2) < 1);
    assert.ok(getSaltFactor(3.5) > 1);

    // Smaller biga % has higher yeast concentration -> higher Phase 1 factor -> less yeast needed
    const baseBiga = {
        useBiga: true,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        bigaHydration: 50,
        temp1: 21,
        dur1: 12,
        temp2: 4,
        dur2: 24,
        temp3: 21,
        dur3: 8
    };
    const b50 = calculateRecipe({ ...baseBiga, bigaPercent: 50 });
    const b80 = calculateRecipe({ ...baseBiga, bigaPercent: 80 });
    const b100 = calculateRecipe({ ...baseBiga, bigaPercent: 100 });
    assert.ok(b50.yeastGrams < b80.yeastGrams && b80.yeastGrams < b100.yeastGrams);

    // Biga hydration does not alter yeast amount
    const h45 = calculateRecipe({ ...baseBiga, bigaPercent: 80, bigaHydration: 45 });
    const h60 = calculateRecipe({ ...baseBiga, bigaPercent: 80, bigaHydration: 60 });
    assert.equal(h45.yeastGrams, h60.yeastGrams);
});

test('yeast type multipliers convert IDY to ADY and Fresh', () => {
    const base = {
        useBiga: false,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        temp1: 4,
        dur1: 24,
        temp2: 21,
        dur2: 8
    };
    const idy = calculateRecipe({ ...base, yeastType: 'idy' });
    const ady = calculateRecipe({ ...base, yeastType: 'ady' });
    const fresh = calculateRecipe({ ...base, yeastType: 'fresh' });

    assert.ok(Math.abs(ady.yeastGrams - idy.yeastGrams * 1.25) < 1e-9);
    assert.ok(Math.abs(fresh.yeastGrams - idy.yeastGrams * 3.0) < 1e-9);
    assert.equal(ady.yeastLabel, 'ADY');
    assert.equal(fresh.yeastLabel, 'Fresh');
});

test('validates missing Biga inputs and impossible biga hydration', () => {
    const missingPhase3 = calculateRecipe({
        useBiga: true,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        bigaPercent: 80,
        bigaHydration: 50,
        temp1: 21,
        dur1: 12,
        temp2: 4,
        dur2: 24,
        temp3: NaN,
        dur3: 8
    });
    assert.ok(missingPhase3.error);

    const negativeWater = calculateRecipe({
        useBiga: true,
        ballWeight: 270,
        ballCount: 3,
        hydration: 60,
        salt: 3,
        bigaPercent: 100,
        bigaHydration: 65,
        temp1: 21,
        dur1: 12,
        temp2: 4,
        dur2: 24,
        temp3: 21,
        dur3: 8
    });
    assert.match(negativeWater.error, /exceeds total dough water/i);

    const badBigaPct = calculateRecipe({
        useBiga: true,
        ballWeight: 270,
        ballCount: 3,
        hydration: 63,
        salt: 3,
        bigaPercent: 120,
        bigaHydration: 50,
        temp1: 21,
        dur1: 12,
        temp2: 4,
        dur2: 24,
        temp3: 21,
        dur3: 8
    });
    assert.match(badBigaPct.error, /1% and 100%/);
});

test('computeStartTime preserves fractional hours and flags past start times', () => {
    // Wednesday 2026-11-18 12:00 local time
    const now = new Date(2026, 10, 18, 12, 0, 0, 0);

    // Target: Saturday (dayIndex 5) at 17:00, 44.5h fermentation -> Thu 20:30 (in the future)
    const future = computeStartTime({ dayIndex: 5, hour: 17, totalHours: 44.5, now });
    assert.equal(future.formattedTime, 'Thu · 20:30');
    assert.equal(future.formattedDuration, '44.5h before pizza time');
    assert.equal(future.isPast, false);

    // Target: Thursday (dayIndex 3) at 17:00, 44h fermentation -> Tue 21:00 (already passed!)
    const past = computeStartTime({ dayIndex: 3, hour: 17, totalHours: 44, now });
    assert.equal(past.formattedTime, 'Tue · 21:00');
    assert.equal(past.isPast, true);
});
