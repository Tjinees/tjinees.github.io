function calculateDough() {
    // --- 1. GET INPUT VALUES ---
    // Total Dough Mass
    const ballWeight = parseFloat(document.getElementById('ballWeight').value);
    const ballCount = parseFloat(document.getElementById('ballCount').value);
    
    // Baker's Percentages
    const hydration = parseFloat(document.getElementById('hydration').value);
    const salt = parseFloat(document.getElementById('salt').value);
    
    // Fermentation Schedule
    const temp1 = parseFloat(document.getElementById('temp1').value);
    const duration1 = parseFloat(document.getElementById('duration1').value);
    const temp2 = parseFloat(document.getElementById('temp2').value);
    const duration2 = parseFloat(document.getElementById('duration2').value);

    // Basic Input Validation
    if (isNaN(ballWeight) || isNaN(ballCount) || isNaN(hydration) || isNaN(salt) || 
        isNaN(temp1) || isNaN(duration1) || isNaN(temp2) || isNaN(duration2)) {
        document.getElementById('results').innerHTML = '<h2>Please enter valid numbers for all fields.</h2>';
        return;
    }
    
    // --- 2. RECIPE INGREDIENT CALCULATION ---
    
    // Total Dough Weight (TDW)
    const totalDoughWeight = ballWeight * ballCount;
    
    // Total Baker's Percentage (Flour is 100%)
    const TBP = 100 + hydration + salt;
    
    // Total Flour Weight (TFW) - The base ingredient
    const totalFlourWeight = (totalDoughWeight / TBP) * 100;
    
    // Ingredient Weights
    const waterNeeded = (totalFlourWeight * hydration) / 100;
    const saltNeeded = (totalFlourWeight * salt) / 100;
    
    // --- 3. YEAST CALCULATION (Empirical Formula) ---
    
    // This formula calculates a Yeast Factor (YF) based on a baseline 24-hour, 25°C fermentation.
    // The multiplier (1 + (25 - T)/10) increases yeast need for lower temps and decreases it for higher temps.
    
    // Stage 1 Yeast Factor
    const YF1 = (duration1 / 24) * (1 + (25 - temp1) / 10);
    
    // Stage 2 Yeast Factor
    const YF2 = (duration2 / 24) * (1 + (25 - temp2) / 10);
    
    // Total Yeast Factor
    const YF = YF1 + YF2;
    
    // Baseline Instant Dry Yeast (IDY) for 24h at 25°C 
    // This is an adjustable value based on desired fermentation intensity (0.08% is a good starting point)
    const baselineYeast = 0.08; 
    
    // Target Yeast Percentage (of flour weight)
    const targetYeastPercent = baselineYeast / YF;
    
    // Final Instant Dry Yeast Weight
    const yeastNeeded = (totalFlourWeight * targetYeastPercent) / 100;

    // --- 4. DISPLAY RESULTS ---
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <h2>✅ Recipe Calculated!</h2>
        <p><strong>Total Dough Weight:</strong> ${totalDoughWeight.toFixed(1)} g</p>
        <hr>
        <h3>Required Ingredients:</h3>
        <p><strong>Flour (100%):</strong> <strong>${totalFlourWeight.toFixed(1)} g</strong></p>
        <p><strong>Water (${hydration}%):</strong> ${waterNeeded.toFixed(1)} g</p>
        <p><strong>Salt (${salt}%):</strong> ${saltNeeded.toFixed(2)} g</p>
        <hr>
        <h3>Yeast Recommendation:</h3>
        <p><strong>Instant Dry Yeast:</strong> <strong>${yeastNeeded.toFixed(3)} g</strong></p>
        <p style="font-size:0.8em; margin-top: 10px;">
            (This is ${targetYeastPercent.toFixed(3)}% of flour weight)
        </p>
    `;
}