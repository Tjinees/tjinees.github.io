function calculateDough() {
    // --- 1. GET INPUTS & CHECK TOGGLE ---
    const useBiga = document.getElementById('useBiga').checked;

    // Core Inputs
    const ballWeight = parseFloat(document.getElementById('ballWeight').value);
    const ballCount = parseFloat(document.getElementById('ballCount').value);
    const totalHydration = parseFloat(document.getElementById('hydration').value);
    const salt = parseFloat(document.getElementById('salt').value);

    // Biga Input (only used if toggled)
    const bigaHydration = useBiga ? parseFloat(document.getElementById('bigaHydration').value) : 0;

    // Fermentation Schedule
    const temp1 = parseFloat(document.getElementById('temp1').value);
    const duration1 = parseFloat(document.getElementById('duration1').value);
    const temp2 = parseFloat(document.getElementById('temp2').value);
    const duration2 = parseFloat(document.getElementById('duration2').value);

    // Update labels based on method
    document.getElementById('label-temp1').textContent = useBiga
        ? 'Fermentation Temperature 1 (Biga Mix) (°C):'
        : 'Fermentation Temperature 1 (Bulk Fermentation) (°C):';
    document.getElementById('label-duration1').textContent = useBiga
        ? 'Fermentation Duration 1 (Biga Rest) (hours):'
        : 'Fermentation Duration 1 (Bulk Fermentation) (hours):';

    // --- 2. INPUT VALIDATION ---
    if (isNaN(ballWeight) || ballWeight <= 0 || isNaN(ballCount) || ballCount <= 0 ||
        isNaN(totalHydration) || isNaN(salt) ||
        isNaN(temp1) || isNaN(duration1) || isNaN(temp2) || isNaN(duration2)) {

        document.getElementById('results').innerHTML = '<h2>⚠️ Please fill in all required fields.</h2>';
        return;
    }
    if (useBiga && (isNaN(bigaHydration) || totalHydration < bigaHydration)) {
        document.getElementById('results').innerHTML = '<h2>⚠️ Biga Hydration must be a valid number and lower than Total Hydration.</h2>';
        return;
    }

    // --- 3. BASE RECIPE CALCULATION ---

    const totalDoughWeight = ballWeight * ballCount;
    const TBP = 100 + totalHydration + salt;
    const totalFlourWeight = (totalDoughWeight / TBP) * 100; // TFW
    const totalWater = (totalFlourWeight * totalHydration) / 100;
    const totalSalt = (totalFlourWeight * salt) / 100;

    // --- 4. YEAST CALCULATION ---

    const baselineYeast = 0.4; // updated, 2.2 hoger

    // Yeast Factor (YF) calculation remains the same, as it depends on total time/temp
    const YF1 = (duration1 / 24) * (1 + (25 - temp1) / 10);
    const YF2 = (duration2 / 24) * (1 + (25 - temp2) / 10);
    const YF = YF1 + YF2;

    // Target Yeast Percentage (of total flour weight)
    const targetYeastPercent = baselineYeast / YF;
    const yeastNeeded = (totalFlourWeight * targetYeastPercent) / 100;

    // --- 5. DYNAMIC OUTPUT GENERATION ---

    const resultsDiv = document.getElementById('results');

    let htmlOutput = `
        <p><strong>Total Dough Weight: ${totalDoughWeight.toFixed(1)} g</strong></p>
        <p><strong>Total Recipe Hydration: ${totalHydration}%</strong></p>
        <hr>
        <h3>Required Ingredients:</h3>
        <p><strong>Flour (100%):</strong> <strong>${totalFlourWeight.toFixed(1)} g</strong></p>
        <p><strong>Water (Total): ${totalWater.toFixed(1)} g</strong></p>
        <p><strong>Salt (Total): ${totalSalt.toFixed(2)} g</strong></p>
        <p><strong>Instant Dry Yeast (${targetYeastPercent.toFixed(3)}%):</strong> <strong>${yeastNeeded.toFixed(3)} g</strong></p>
        <hr>
    `;

    if (useBiga) {
        // BIGA METHOD BREAKDOWN

        // Biga Ingredients
        const bigaFlour = totalFlourWeight;
        const bigaWater = (bigaFlour * bigaHydration) / 100;

        // Final Mix Ingredients
        const remainingWaterPercent = totalHydration - bigaHydration;
        const remainingWater = (totalFlourWeight * remainingWaterPercent) / 100;

        htmlOutput += `
            <h3>Phase 1: The Biga Mix</h3>
            <p><strong>Flour:</strong> <strong>${bigaFlour.toFixed(1)} g</strong></p>
            <p><strong>Water (${bigaHydration}%):</strong> <strong>${bigaWater.toFixed(1)} g</strong></p>
            <p><strong>Instant Dry Yeast:</strong> <strong>${yeastNeeded.toFixed(3)} g</strong></p>

            <hr>

            <h3>Phase 2: Final Dough (After Biga Fermentation)</h3>
            <p><strong>Biga: ${(bigaFlour + bigaWater + yeastNeeded).toFixed(1)} g</strong></p>
            <p><strong>Remaining Water:</strong> <strong>${remainingWater.toFixed(1)} g</strong></p>
            <p><strong>Remaining Salt:</strong> <strong>${totalSalt.toFixed(2)} g</strong></p>
        `;

    } else {

    }

    resultsDiv.innerHTML = htmlOutput;
}

// Initial function call upon loading the body (defined in index.html's <body> tag)