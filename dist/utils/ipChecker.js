"use strict";

const axios = require("axios");
require("dotenv").config();
const checkIPReputation = async ip => {
  try {
    const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
      params: {
        ipAddress: ip,
        maxAgeInDays: 90
      },
      headers: {
        Key: process.env.ABUSEIPDB_API_KEY,
        Accept: "application/json"
      }
    });
    const data = response.data.data;
    return {
      ip: data.ipAddress,
      isWhitelisted: data.isWhitelisted,
      abuseConfidenceScore: data.abuseConfidenceScore,
      country: data.countryCode,
      domain: data.domain,
      totalReports: data.totalReports,
      lastReportedAt: data.lastReportedAt
    };
  } catch (err) {
    console.error("Error checking IP:", err.message);
    return null;
  }
};
module.exports = {
  checkIPReputation
};