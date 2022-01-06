const axios = require('axios');


const API_ENDPOINT = process.env.API_ENDPOINT;

async function getSubmissions(_params) {
  // console.log('Getting submissions...');
  const params = _params || {};
  const url = `${API_ENDPOINT}/api/Transactions/getUnclaimedTransactions`;
  const response = await axios.get(url, { params });
  const submissions = response.data;
  // console.log(`Received ${submissions.length} submissions`);
  return submissions;
}

async function getSubmission(submissionId) {
    const url = `${API_ENDPOINT}/api/Transactions/GetFullSubmissionInfo?filter=${submissionId}&filterType=2`;
    const response = await axios.get(url);
    const submissions = response.data.send;
    return submissions;
  }

async function getSubmissionConfirmations(submissionId) {
  // const timeStart = new Date();
  // console.log(`Submission ${submissionId} - getting confirmations...`);
  const url = `${API_ENDPOINT}/api/SubmissionConfirmations/getForSubmission?submissionId=${submissionId}`;
  const response = await axios.get(url);
  const confirmations = response.data;
  // console.log(`Submission ${submissionId} - received ${confirmations.length} confirmations`);
  // console.log(`API delay(ConfirmNewAssets): ${since(timeStart)} sec.`);
  return confirmations;
}

async function getNewAssetDeployConfirmations(debridgeId) {
  // const timeStart = new Date();
  // console.log(`debridgeId ${debridgeId} - getting confirmations...`);
  const url = `${API_ENDPOINT}/api/ConfirmNewAssets/GetForDebridgeId?debridgeId=${debridgeId}`;
  const response = await axios.get(url);
  const confirmations = response.data;
  // console.log(`debridgeId ${debridgeId} - received ${confirmations.length} confirmations`);
  // console.log(`API delay(ConfirmNewAssets): ${since(timeStart)} sec.`);
  return confirmations;
}

module.exports = {
  getSubmissions,
  getSubmission,
  getSubmissionConfirmations,
  getNewAssetDeployConfirmations,
};