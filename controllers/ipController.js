const axios = require("axios");

const checkIP = async (req, res) => {
  const ip = req.query.ip; // Get IP from query params
  const API_KEY =
    "12d5614dbd2bee0ec1853da236802e91982fb1729d8220fa8c660b72840c7321317d72d72607725c";

  if (!ip) {
    return res
      .status(400)
      .json({ error: "IP address required in query param" });
  }

  try {
    const response = await axios.get("https://api.abuseipdb.com/api/v2/check", {
      params: {
        ipAddress: ip,
        maxAgeInDays: 90,
      },
      headers: {
        Key: API_KEY,
        Accept: "application/json",
      },
    });

    const data = response.data.data;

    console.log(`✅ IP ${ip} fetched from AbuseIPDB`);
    return res.json({
      ip: data.ipAddress,
      isWhitelisted: data.isWhitelisted,
      abuseConfidenceScore: data.abuseConfidenceScore,
      country: data.countryCode,
      domain: data.domain,
      totalReports: data.totalReports,
      lastReportedAt: data.lastReportedAt,
    });
  } catch (err) {
    console.error("❌ Error checking IP:", err.response?.data || err.message);
    return res.status(500).json({ error: "IP check failed" });
  }
};

module.exports = { checkIP };
