const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const getSettings = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM site_settings ORDER BY id DESC LIMIT 1');
    return successResponse(res, 'Site settings loaded', rows[0] || null);
  } catch (err) {
    return errorResponse(res, 'Failed to fetch site settings', err, 500);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { id, ...payload } = req.body;
    const logo = req.files?.logo?.[0]
      ? `/uploads/branding/${req.files.logo[0].filename}`
      : payload.logo;
    const favicon = req.files?.favicon?.[0]
      ? `/uploads/branding/${req.files.favicon[0].filename}`
      : payload.favicon;
    const heroImage = req.files?.hero_image?.[0]
      ? `/uploads/branding/${req.files.hero_image[0].filename}`
      : payload.hero_image;
    const getPromotionMedia = (fieldName, currentValue) => {
      if (req.body[`remove_${fieldName}`] === 'true') return null;
      return req.files?.[fieldName]?.[0]
        ? `/uploads/branding/${req.files[fieldName][0].filename}`
        : currentValue;
    };
    const promotionMedia = getPromotionMedia('promotion_media', payload.promotion_media);
    const promotionMedia2 = getPromotionMedia('promotion_media_2', payload.promotion_media_2);
    const promotionMedia3 = getPromotionMedia('promotion_media_3', payload.promotion_media_3);
    const [currentRows] = await pool.query('SELECT * FROM site_settings ORDER BY id DESC LIMIT 1');

    if (!currentRows.length) {
      const [result] = await pool.query(
        `INSERT INTO site_settings (
          school_name,
          tagline,
          logo,
          favicon,
          hero_image,
          promotion_media,
          promotion_media_2,
          promotion_media_3,
          address,
          phone,
          email,
          whatsapp,
          facebook,
          instagram,
          youtube,
          map_url,
          office_hours,
          about_short,
          footer_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.school_name || '',
          payload.tagline || '',
          logo || '',
          favicon || '',
          heroImage || '',
          promotionMedia || '',
          promotionMedia2 || '',
          promotionMedia3 || '',
          payload.address || '',
          payload.phone || '',
          payload.email || '',
          payload.whatsapp || '',
          payload.facebook || '',
          payload.instagram || '',
          payload.youtube || '',
          payload.map_url || '',
          payload.office_hours || '',
          payload.about_short || '',
          payload.footer_text || '',
        ]
      );

      return successResponse(res, 'Settings created successfully', { id: result.insertId });
    }

    await pool.query(
      `UPDATE site_settings SET
        school_name = ?,
        tagline = ?,
        logo = ?,
        favicon = ?,
        hero_image = ?,
        promotion_media = ?,
        promotion_media_2 = ?,
        promotion_media_3 = ?,
        address = ?,
        phone = ?,
        email = ?,
        whatsapp = ?,
        facebook = ?,
        instagram = ?,
        youtube = ?,
        map_url = ?,
        office_hours = ?,
        about_short = ?,
        footer_text = ?
      WHERE id = ?`,
      [
        payload.school_name || currentRows[0].school_name,
        payload.tagline !== undefined ? payload.tagline : currentRows[0].tagline,
        logo !== undefined ? logo : currentRows[0].logo,
        favicon !== undefined ? favicon : currentRows[0].favicon,
        heroImage !== undefined ? heroImage : currentRows[0].hero_image,
        promotionMedia !== undefined ? promotionMedia : currentRows[0].promotion_media,
        promotionMedia2 !== undefined ? promotionMedia2 : currentRows[0].promotion_media_2,
        promotionMedia3 !== undefined ? promotionMedia3 : currentRows[0].promotion_media_3,
        payload.address !== undefined ? payload.address : currentRows[0].address,
        payload.phone !== undefined ? payload.phone : currentRows[0].phone,
        payload.email !== undefined ? payload.email : currentRows[0].email,
        payload.whatsapp !== undefined ? payload.whatsapp : currentRows[0].whatsapp,
        payload.facebook !== undefined ? payload.facebook : currentRows[0].facebook,
        payload.instagram !== undefined ? payload.instagram : currentRows[0].instagram,
        payload.youtube !== undefined ? payload.youtube : currentRows[0].youtube,
        payload.map_url !== undefined ? payload.map_url : currentRows[0].map_url,
        payload.office_hours !== undefined ? payload.office_hours : currentRows[0].office_hours,
        payload.about_short !== undefined ? payload.about_short : currentRows[0].about_short,
        payload.footer_text !== undefined ? payload.footer_text : currentRows[0].footer_text,
        currentRows[0].id,
      ]
    );

    return successResponse(res, 'Settings updated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to update site settings', err, 500);
  }
};

module.exports = { getSettings, updateSettings };
