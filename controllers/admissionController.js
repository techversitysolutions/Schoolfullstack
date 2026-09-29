const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const submitAdmission = async (req, res) => {
  try {
    const { student_name, guardian_name, phone, email, grade, message } = req.body;

    if (!student_name || !phone || !email) {
      return errorResponse(res, 'Student name, phone and email are required', null, 400);
    }

    await pool.query(
      'INSERT INTO admission_enquiries (student_name, guardian_name, phone, email, grade, message) VALUES (?, ?, ?, ?, ?, ?)',
      [student_name, guardian_name, phone, email, grade, message]
    );

    return successResponse(res, 'Admission enquiry submitted successfully', null, 201);
  } catch (err) {
    return errorResponse(res, 'Failed to submit admission enquiry', err, 500);
  }
};

const getAllAdmissions = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM admission_enquiries ORDER BY created_at DESC');
    return successResponse(res, 'Admission enquiries loaded', rows);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch admission enquiries', err, 500);
  }
};

const updateAdmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE admission_enquiries SET status = ? WHERE id = ?', [status || 'new', id]);
    return successResponse(res, 'Admission enquiry updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update admission enquiry', err, 500);
  }
};

module.exports = { submitAdmission, getAllAdmissions, updateAdmissionStatus };
