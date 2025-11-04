const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');
const multer = require('multer');
const path = require('path');

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/vendor-logos/');
  },
  filename: (req, file, cb) => {
    cb(null, `vendor-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed!'));
  }
});

/**
 * @desc    Get vendor settings
 * @route   GET /api/vendor/settings
 * @access  Private/Vendor
 */
exports.getVendorSettings = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const vendor = await db('vendors')
      .where('id', vendorId)
      .first();

    if (!vendor) throw new AppError('Vendor not found', 404);

    // Get notification preferences
    const notificationPrefs = await db('vendor_notification_preferences')
      .where('vendor_id', vendorId)
      .first();

    successResponse(res, {
      vendor,
      notification_preferences: notificationPrefs
    }, 'Vendor settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update vendor profile
 * @route   PUT /api/vendor/settings/profile
 * @access  Private/Vendor
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { business_name, description, contact_email, contact_phone, website } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        business_name,
        description,
        contact_email,
        contact_phone,
        website,
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update business info
 * @route   PUT /api/vendor/settings/business
 * @access  Private/Vendor
 */
exports.updateBusinessInfo = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      legal_business_name,
      registration_number,
      tax_id,
      business_address,
      business_city,
      business_country,
      business_postal_code
    } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        legal_business_name,
        registration_number,
        tax_id,
        business_address: JSON.stringify({
          address: business_address,
          city: business_city,
          country: business_country,
          postal_code: business_postal_code
        }),
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Business info updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/vendor/settings/notifications
 * @access  Private/Vendor
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      email_new_orders,
      email_new_reviews,
      email_low_stock,
      email_payout_updates,
      email_marketing_tips,
      sms_new_orders,
      sms_urgent_alerts,
      push_new_orders,
      push_new_messages
    } = req.body;

    // Check if preferences exist
    const existing = await db('vendor_notification_preferences')
      .where('vendor_id', vendorId)
      .first();

    const preferences = {
      vendor_id: vendorId,
      email_new_orders: email_new_orders !== undefined ? email_new_orders : true,
      email_new_reviews: email_new_reviews !== undefined ? email_new_reviews : true,
      email_low_stock: email_low_stock !== undefined ? email_low_stock : true,
      email_payout_updates: email_payout_updates !== undefined ? email_payout_updates : true,
      email_marketing_tips: email_marketing_tips !== undefined ? email_marketing_tips : false,
      sms_new_orders: sms_new_orders !== undefined ? sms_new_orders : false,
      sms_urgent_alerts: sms_urgent_alerts !== undefined ? sms_urgent_alerts : true,
      push_new_orders: push_new_orders !== undefined ? push_new_orders : true,
      push_new_messages: push_new_messages !== undefined ? push_new_messages : true,
      updated_at: db.fn.now()
    };

    if (existing) {
      await db('vendor_notification_preferences')
        .where('vendor_id', vendorId)
        .update(preferences);
    } else {
      preferences.created_at = db.fn.now();
      await db('vendor_notification_preferences').insert(preferences);
    }

    const updated = await db('vendor_notification_preferences')
      .where('vendor_id', vendorId)
      .first();

    successResponse(res, { preferences: updated }, 'Notification preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload vendor logo
 * @route   POST /api/vendor/settings/logo
 * @access  Private/Vendor
 */
exports.uploadLogo = async (req, res, next) => {
  try {
    upload.single('logo')(req, res, async (err) => {
      if (err) {
        return next(new AppError(err.message, 400));
      }

      if (!req.file) {
        return next(new AppError('Please upload a file', 400));
      }

      const vendorId = req.user.vendorId || req.user.id;
      const logoUrl = `/uploads/vendor-logos/${req.file.filename}`;

      await db('vendors')
        .where('id', vendorId)
        .update({
          logo_url: logoUrl,
          updated_at: db.fn.now()
        });

      const vendor = await db('vendors').where('id', vendorId).first();
      successResponse(res, { vendor, logo_url: logoUrl }, 'Logo uploaded successfully');
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update store hours
 * @route   PUT /api/vendor/settings/store-hours
 * @access  Private/Vendor
 */
exports.updateStoreHours = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { store_hours } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        store_hours: JSON.stringify(store_hours),
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Store hours updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update social media links
 * @route   PUT /api/vendor/settings/social-media
 * @access  Private/Vendor
 */
exports.updateSocialMedia = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { facebook, instagram, twitter, youtube, tiktok } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        social_media: JSON.stringify({
          facebook,
          instagram,
          twitter,
          youtube,
          tiktok
        }),
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Social media links updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update return policy
 * @route   PUT /api/vendor/settings/return-policy
 * @access  Private/Vendor
 */
exports.updateReturnPolicy = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { return_policy, return_period_days, accepts_returns } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        return_policy,
        return_period_days,
        accepts_returns: accepts_returns !== undefined ? accepts_returns : true,
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Return policy updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update payment settings
 * @route   PUT /api/vendor/settings/payment
 * @access  Private/Vendor
 */
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { accepted_payment_methods, payment_instructions } = req.body;

    await db('vendors')
      .where('id', vendorId)
      .update({
        accepted_payment_methods: JSON.stringify(accepted_payment_methods),
        payment_instructions,
        updated_at: db.fn.now()
      });

    const vendor = await db('vendors').where('id', vendorId).first();
    successResponse(res, { vendor }, 'Payment settings updated successfully');
  } catch (error) {
    next(error);
  }
};
