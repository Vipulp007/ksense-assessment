const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Helper: parse blood pressure "Systolic/Diastolic"
function parseBP(bp) {
  const match = bp.match(/^(\d+)\/(\d+)$/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2])];
  }
  return [null, null];
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateRiskScore(systolic, diastolic, temp, age) {
    let riskScore = 0;

    // --- Blood Pressure Score ---
    if(systolic < 120 && diastolic < 80) {
        riskScore += 0; // Normal
    } else if(systolic >= 120 && systolic < 130 && diastolic < 80) {
        riskScore += 1; // Elevated
    } else if((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
        riskScore += 2; // Stage 1
    } else if(systolic >= 140 || diastolic >= 90) {
        riskScore += 3; // Stage 2
    }

    // --- Temperature Score ---
    if(temp <= 99.5) {
        riskScore += 0; // Normal
    } else if(temp >= 99.6 && temp <= 100.9) {
        riskScore += 1; // Low Fever
    } else if(temp >= 101) {
        riskScore += 2; // High Fever
    }

    // --- Age Score ---
    if(age < 40) {
        riskScore += 1; // Under 40
    } else if(age >= 40 && age <= 65) {
        riskScore += 1; // 40–65
    } else if(age > 65) {
        riskScore += 2; // Over 65
    }

    return riskScore;
}

// Fetch and process patients
async function fetchAndProcessPatients() {
  let page = 1;
  let hasNext = true;
  let BASE_URL = "https://assessment.ksensetech.com/api/patients";
  
  const result = [];
  const API_KEY = "ak_47d1592d07f32aa9d484066f6b691466f321f92a23f8e1eb";

  const highRiskPatients = [];
  const feverPatients = [];
  const dataQualityIssues = [];
  
  while(hasNext){
    const API_URL = BASE_URL + `?page=${page}&limit=10`;
    let attempts = 0;
    const maxRetries = 5;
    let success = false;
    let response;

    while(!success && attempts < maxRetries){
      try{
        response = await axios.get(API_URL, {
          headers: {
            "x-api-key": API_KEY
          },
          timeout: 5000
        });
        success = true
      }
      catch (error){
        attempts++;
        if (error.response && error.response.status === 429) {
          await sleep(1000*attempts);
        } else {
          await sleep(1000*attempts);
        }
        console.log(attempts)
        if (attempts === maxRetries) {
          console.error(`Failed to fetch page ${page}:`, error.message);
          return { error: "Failed to fetch patients after retries" };
        }
      }
    }

    const patients = response.data.data || [];
    hasNext = response.data?.pagination?.hasNext;

    patients.forEach(p => {

      const pid = p.patient_id;
      const age = Number(p.age);
      const temp = Number(p.temperature);
      const [systolic, diastolic] = parseBP(p.blood_pressure || "");
      let invalid = false;

      // Check for missing/invalid data
      if (
        pid == null || 
        systolic == null || isNaN(systolic) ||
        diastolic == null || isNaN(diastolic) ||
        temp == null || isNaN(temp) ||
        age == null || isNaN(age)
      ) {
        dataQualityIssues.push(pid || "UNKNOWN_ID");
        invalid = true
      }

      // Calculate total risk score
      if(!invalid){
        const totalScore = calculateRiskScore(systolic, diastolic, temp, age);
        if(totalScore >= 4) highRiskPatients.push(pid);
      }

      // Fever patients
      if(temp >= 99.6) feverPatients.push(pid);
    });

    page++;
    await sleep(1000)
  }

  result.push({
    high_risk_patients: highRiskPatients,
    fever_patients: feverPatients,
    data_quality_issues: dataQualityIssues
  });

  console.log(result);
}

// const result = await fetchAndProcessPatients();
fetchAndProcessPatients().then(console.log);