(function (root) {
    const YEAST_TYPES = {
        idy: { label: 'IDY', multiplier: 1.0 },
        ady: { label: 'ADY', multiplier: 1.25 },
        fresh: { label: 'Fresh', multiplier: 3.0 }
    };

    const REF_TEMP_C = 21;
    const DOUBLING_INTERVAL_C = 8; // Q10 ≈ 2.38 (doubles every 8°C in the active band)
    const COLD_TAPER_TEMP_C = 12;  // Smooth dormancy taper below 12°C toward 0°C
    const MAX_ACTIVE_TEMP_C = 33;  // Biological peak plateau
    const COOL_LAG_HOURS = 3;      // Bulk dough cool-down time into fridge
    const WARM_LAG_HOURS = 2;      // Dough ball warm-up time out of fridge
    const YEAST_CURVE_K = 3.9;     // Power-law anchor constant (IDY %, balanced Neapolitan)
    const YEAST_CURVE_EXP = 1.65;  // Super-linear exponent reflecting exponential yeast growth
    const REF_SALT_PERCENT = 3;    // Reference salt % where saltFactor = 1.0
    const SALT_FACTOR_PER_PCT = 1.15; // ~15% more yeast per +1% salt inhibition
    const REF_BIGA_PERCENT = 80;   // Reference biga % where Phase 1 factor = 0.70
    const BASE_BIGA_P1_FACTOR = 0.7;

    /**
     * Scales Phase 1 biga fermentation speed based on biga percentage.
     * Smaller bigas hold higher yeast concentration per gram of flour and mature faster.
     */
    function getBigaPhase1Factor(bigaPercent) {
        const raw = BASE_BIGA_P1_FACTOR * Math.pow(REF_BIGA_PERCENT / bigaPercent, 0.35);
        return Math.min(1.15, Math.max(0.55, raw));
    }

    /**
     * Adjusts yeast requirement for salt inhibition, anchored at 1.0 for 3% salt.
     */
    function getSaltFactor(saltPercent) {
        return Math.pow(SALT_FACTOR_PER_PCT, saltPercent - REF_SALT_PERCENT);
    }

    /**
     * Relative yeast fermentation rate at temperature T (°C), anchored at 1.0 for 21°C.
     */
    function getTempActivityRate(temp) {
        if (temp <= 0) return 0;

        const effTemp = Math.min(temp, MAX_ACTIVE_TEMP_C);
        const qRate = Math.pow(2, (effTemp - REF_TEMP_C) / DOUBLING_INTERVAL_C);

        if (effTemp >= COLD_TAPER_TEMP_C) {
            return qRate;
        }

        // Smoothstep (0 at 0°C -> 1 at 12°C) models cold dormancy without discontinuities
        const u = effTemp / COLD_TAPER_TEMP_C;
        const dormancy = u * u * (3 - 2 * u);
        return qRate * dormancy;
    }

    /**
     * Estimates the dough temperature at the end of a phase.
     */
    function getPhaseEndTemp(hours, targetTemp, startTemp) {
        if (hours <= 0 || targetTemp === startTemp) return startTemp;
        const lagHours = targetTemp < startTemp ? COOL_LAG_HOURS : WARM_LAG_HOURS;
        const progress = Math.min(1, hours / lagHours);
        return startTemp + (targetTemp - startTemp) * progress;
    }

    /**
     * Converts fermentation hours at targetTemp (°C) into equivalent hours at 21°C,
     * accounting for thermal cool-down or warm-up from startTemp.
     */
    function getEquivalentHours(hours, targetTemp, startTemp = targetTemp) {
        if (hours <= 0) return 0;

        if (targetTemp === startTemp) {
            return hours * getTempActivityRate(targetTemp);
        }

        const lagHours = targetTemp < startTemp ? COOL_LAG_HOURS : WARM_LAG_HOURS;
        const transitionHours = Math.min(lagHours, hours);
        const steadyHours = Math.max(0, hours - transitionHours);
        const endTransitionTemp = getPhaseEndTemp(transitionHours, targetTemp, startTemp);
        const avgTransitionTemp = (startTemp + endTransitionTemp) / 2;

        return (
            transitionHours * getTempActivityRate(avgTransitionTemp) +
            steadyHours * getTempActivityRate(targetTemp)
        );
    }

    /**
     * Pure dough and yeast calculation.
     * Returns either `{ error: string }` or the computed recipe object.
     */
    function calculateRecipe(params) {
        const {
            useBiga,
            ballWeight,
            ballCount,
            hydration,
            salt,
            bigaPercent = 80,
            bigaHydration = 50,
            temp1,
            dur1,
            temp2,
            dur2,
            temp3 = 0,
            dur3 = 0,
            yeastType = 'idy'
        } = params;

        const requiredNumbers = [ballWeight, ballCount, hydration, salt, temp1, dur1, temp2, dur2];
        if (useBiga) {
            requiredNumbers.push(bigaPercent, bigaHydration, temp3, dur3);
        }
        if (requiredNumbers.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
            return { error: 'Enter all values...' };
        }

        if (ballWeight <= 0 || ballCount <= 0) {
            return { error: 'Ball weight and number of balls must be greater than 0.' };
        }
        if (hydration <= 0 || salt < 0) {
            return { error: 'Hydration must be greater than 0% and salt cannot be negative.' };
        }
        if (dur1 < 0 || dur2 < 0 || (useBiga && dur3 < 0)) {
            return { error: 'Fermentation hours cannot be negative.' };
        }
        if (useBiga && (bigaPercent <= 0 || bigaPercent > 100)) {
            return { error: 'Biga percentage must be between 1% and 100%.' };
        }
        if (useBiga && bigaHydration < 0) {
            return { error: 'Biga hydration cannot be negative.' };
        }

        const yeastConfig = YEAST_TYPES[yeastType] || YEAST_TYPES.idy;

        // Recipe math
        const totalDough = ballWeight * ballCount;
        const totalFlour = (totalDough / (100 + hydration + salt)) * 100;
        const totalWater = (totalFlour * hydration) / 100;
        const totalSalt = (totalFlour * salt) / 100;

        let biga = null;
        if (useBiga) {
            const bigaFlour = (totalFlour * bigaPercent) / 100;
            const remFlour = totalFlour - bigaFlour;
            const bigaWater = (bigaFlour * bigaHydration) / 100;
            const remWater = totalWater - bigaWater;

            if (remWater < -1e-9) {
                return {
                    error: 'Biga water exceeds total dough water. Lower biga % or biga hydration, or raise dough hydration.'
                };
            }

            biga = {
                flour: bigaFlour,
                water: bigaWater,
                remFlour: Math.max(0, remFlour),
                remWater: Math.max(0, remWater)
            };
        }

        // Fermentation model (equivalent hours at 21°C)
        let totalEqHours = 0;

        if (useBiga) {
            const bigaP1Factor = getBigaPhase1Factor(bigaPercent);
            const eq1 = getEquivalentHours(dur1, temp1, temp1) * bigaP1Factor;
            // Final mix starts near room temp (21°C) before entering Phase 2 (typically fridge)
            const eq2 = getEquivalentHours(dur2, temp2, REF_TEMP_C);
            const phase2EndTemp = getPhaseEndTemp(dur2, temp2, REF_TEMP_C);
            const eq3 = getEquivalentHours(dur3, temp3, phase2EndTemp);
            totalEqHours = eq1 + eq2 + eq3;
        } else {
            // Fresh direct mix starts near room temp (21°C)
            const eq1 = getEquivalentHours(dur1, temp1, REF_TEMP_C);
            const phase1EndTemp = getPhaseEndTemp(dur1, temp1, REF_TEMP_C);
            const eq2 = getEquivalentHours(dur2, temp2, phase1EndTemp);
            totalEqHours = eq1 + eq2;
        }

        totalEqHours = Math.max(0.5, totalEqHours);

        // Power-law IDY% curve adjusted for salt inhibition and converted to selected yeast type
        const saltFactor = getSaltFactor(salt);
        const idyPercent = YEAST_CURVE_K * Math.pow(totalEqHours, -YEAST_CURVE_EXP) * saltFactor;
        const yeastIdyGrams = (totalFlour * idyPercent) / 100;
        const yeastGrams = yeastIdyGrams * yeastConfig.multiplier;

        return {
            useBiga,
            totalDough,
            totalFlour,
            totalWater,
            totalSalt,
            totalEqHours,
            idyPercent,
            yeastIdyGrams,
            yeastGrams,
            yeastType: yeastType in YEAST_TYPES ? yeastType : 'idy',
            yeastLabel: yeastConfig.label,
            biga
        };
    }

    const api = {
        YEAST_TYPES,
        getTempActivityRate,
        getEquivalentHours,
        getBigaPhase1Factor,
        getSaltFactor,
        calculateRecipe
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.DoughCalculator = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
