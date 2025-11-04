const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get vendor requests
 * @route   GET /api/admin/vendor-requests
 * @access  Private/Admin
 */
exports.getVendorRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = db('vendor_requests as vr')
      .leftJoin('users as u', 'vr.user_id', 'u.id')
      .select(
        'vr.id',
        'vr.user_id',
        'vr.business_name',
        'vr.business_type',
        'vr.registration_number',
        'vr.tax_id',
        'vr.business_address',
        'vr.contact_email',
        'vr.contact_phone',
        'vr.website',
        'vr.description',
        'vr.documents',
        'vr.status',
        'vr.reviewed_by',
        'vr.reviewed_at',
        'vr.rejection_reason',
        'vr.created_at',
        'u.email as user_email',
        'u.first_name',
        'u.last_name'
      );

    if (status) query = query.where('vr.status', status);
    
    if (search) {
      query = query.where(function() {
        this.where('vr.business_name', 'like', `%${search}%`)
            .orWhere('vr.contact_email', 'like', `%${search}%`)
            .orWhere('u.email', 'like', `%${search}%`);
      });
    }

    const [{ count: total }] = await query.clone().count('vr.id as count');
    const requests = await query
      .orderBy('vr.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse documents JSON
    const requestsWithParsedDocs = requests.map(req => ({
      ...req,
      documents: req.documents ? JSON.parse(req.documents) : null,
      business_address: req.business_address ? JSON.parse(req.business_address) : null
    }));

    successResponse(res, {
      requests: requestsWithParsedDocs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total), pages: Math.ceil(total / limit) }
    }, 'Vendor requests retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single vendor request
 * @route   GET /api/admin/vendor-requests/:id
 * @access  Private/Admin
 */
exports.getVendorRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await db('vendor_requests as vr')
      .leftJoin('users as u', 'vr.user_id', 'u.id')
      .leftJoin('users as reviewer', 'vr.reviewed_by', 'reviewer.id')
      .where('vr.id', id)
      .select(
        'vr.*',
        'u.email as user_email',
        'u.first_name as user_first_name',
        'u.last_name as user_last_name',
        'u.phone as user_phone',
        'reviewer.first_name as reviewer_first_name',
        'reviewer.last_name as reviewer_last_name'
      )
      .first();

    if (!request) throw new AppError('Vendor request not found', 404);

    // Parse JSON fields
    request.documents = request.documents ? JSON.parse(request.documents) : null;
    request.business_address = request.business_address ? JSON.parse(request.business_address) : null;

    successResponse(res, { request }, 'Vendor request retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve vendor request
 * @route   POST /api/admin/vendor-requests/:id/approve
 * @access  Private/Admin
 */
exports.approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subscription_plan = 'basic', message } = req.body;

    const request = await db('vendor_requests').where('id', id).first();
    if (!request) throw new AppError('Vendor request not found', 404);

    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be approved', 400);
    }

    await db.transaction(async (trx) => {
      // Create vendor account
      const [vendorId] = await trx('vendors').insert({
        user_id: request.user_id,
        business_name: request.business_name,
        business_type: request.business_type,
        registration_number: request.registration_number,
        tax_id: request.tax_id,
        business_address: request.business_address,
        contact_email: request.contact_email,
        contact_phone: request.contact_phone,
        website: request.website,
        description: request.description,
        subscription_plan,
        status: 'active',
        approved_at: db.fn.now(),
        created_at: db.fn.now()
      });

      // Update user role to vendor
      await trx('users')
        .where('id', request.user_id)
        .update({
          role: 'vendor',
          vendor_id: vendorId,
          updated_at: db.fn.now()
        });

      // Update request status
      await trx('vendor_requests')
        .where('id', id)
        .update({
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: db.fn.now(),
          approval_message: message,
          updated_at: db.fn.now()
        });

      // TODO: Send approval email to vendor
    });

    successResponse(res, null, 'Vendor request approved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject vendor request
 * @route   POST /api/admin/vendor-requests/:id/reject
 * @access  Private/Admin
 */
exports.rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) throw new AppError('Rejection reason is required', 400);

    const request = await db('vendor_requests').where('id', id).first();
    if (!request) throw new AppError('Vendor request not found', 404);

    if (request.status !== 'pending') {
      throw new AppError('Only pending requests can be rejected', 400);
    }

    await db('vendor_requests')
      .where('id', id)
      .update({
        status: 'rejected',
        reviewed_by: req.user.id,
        reviewed_at: db.fn.now(),
        rejection_reason: reason,
        updated_at: db.fn.now()
      });

    // TODO: Send rejection email to user

    successResponse(res, null, 'Vendor request rejected successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request additional info
 * @route   POST /api/admin/vendor-requests/:id/request-info
 * @access  Private/Admin
 */
exports.requestAdditionalInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) throw new AppError('Message is required', 400);

    const request = await db('vendor_requests').where('id', id).first();
    if (!request) throw new AppError('Vendor request not found', 404);

    await db('vendor_requests')
      .where('id', id)
      .update({
        status: 'info_requested',
        reviewed_by: req.user.id,
        reviewed_at: db.fn.now(),
        additional_info_message: message,
        updated_at: db.fn.now()
      });

    // TODO: Send email requesting additional information

    successResponse(res, null, 'Additional information requested successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor requests statistics
 * @route   GET /api/admin/vendor-requests/stats
 * @access  Private/Admin
 */
exports.getRequestsStats = async (req, res, next) => {
  try {
    const [{ total_requests }] = await db('vendor_requests')
      .count('* as total_requests');

    const requestsByStatus = await db('vendor_requests')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const [{ pending_requests }] = await db('vendor_requests')
      .where('status', 'pending')
      .count('* as pending_requests');

    // Recent requests (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ recent_requests }] = await db('vendor_requests')
      .where('created_at', '>=', thirtyDaysAgo)
      .count('* as recent_requests');

    // Average processing time (for approved/rejected)
    const avgProcessingTime = await db('vendor_requests')
      .whereIn('status', ['approved', 'rejected'])
      .select(db.raw('AVG(TIMESTAMPDIFF(HOUR, created_at, reviewed_at)) as avg_hours'));

    successResponse(res, {
      total_requests: parseInt(total_requests) || 0,
      pending_requests: parseInt(pending_requests) || 0,
      recent_requests: parseInt(recent_requests) || 0,
      requests_by_status: requestsByStatus,
      avg_processing_time_hours: parseFloat(avgProcessingTime[0]?.avg_hours) || 0
    }, 'Vendor requests statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download vendor request document
 * @route   GET /api/admin/vendor-requests/:id/documents/:type
 * @access  Private/Admin
 */
exports.downloadDocument = async (req, res, next) => {
  try {
    const { id, type } = req.params;

    const request = await db('vendor_requests').where('id', id).first();
    if (!request) throw new AppError('Vendor request not found', 404);

    const documents = JSON.parse(request.documents || '{}');
    const documentPath = documents[type];

    if (!documentPath) {
      throw new AppError('Document not found', 404);
    }

    // TODO: Implement file download logic
    // For now, return the document path
    successResponse(res, { document_path: documentPath }, 'Document path retrieved successfully');
  } catch (error) {
    next(error);
  }
};
