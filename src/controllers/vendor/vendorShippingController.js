const db = require('../../config/database');
const { successResponse } = require('../../utils/responseHandler');
const AppError = require('../../utils/AppError');

/**
 * @desc    Get shipping zones
 * @route   GET /api/vendor/shipping/zones
 * @access  Private/Vendor
 */
exports.getShippingZones = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const zones = await db('shipping_zones')
      .where('vendor_id', vendorId)
      .select('*')
      .orderBy('created_at', 'desc');

    // Get rates for each zone
    const zonesWithRates = await Promise.all(
      zones.map(async (zone) => {
        const rates = await db('shipping_rates')
          .where('zone_id', zone.id)
          .select('*')
          .orderBy('min_weight', 'asc');

        return {
          ...zone,
          countries: JSON.parse(zone.countries || '[]'),
          rates
        };
      })
    );

    successResponse(res, { zones: zonesWithRates }, 'Shipping zones retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create shipping zone
 * @route   POST /api/vendor/shipping/zones
 * @access  Private/Vendor
 */
exports.createShippingZone = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { name, countries, is_active } = req.body;

    const [zoneId] = await db('shipping_zones').insert({
      vendor_id: vendorId,
      name,
      countries: JSON.stringify(countries),
      is_active: is_active !== undefined ? is_active : true,
      created_at: db.fn.now()
    });

    const zone = await db('shipping_zones').where('id', zoneId).first();
    successResponse(res, { zone: { ...zone, countries: JSON.parse(zone.countries) } }, 'Shipping zone created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update shipping zone
 * @route   PUT /api/vendor/shipping/zones/:id
 * @access  Private/Vendor
 */
exports.updateShippingZone = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const { name, countries, is_active } = req.body;

    const zone = await db('shipping_zones')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!zone) throw new AppError('Shipping zone not found', 404);

    await db('shipping_zones')
      .where('id', id)
      .update({
        name,
        countries: JSON.stringify(countries),
        is_active,
        updated_at: db.fn.now()
      });

    const updated = await db('shipping_zones').where('id', id).first();
    successResponse(res, { zone: { ...updated, countries: JSON.parse(updated.countries) } }, 'Shipping zone updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete shipping zone
 * @route   DELETE /api/vendor/shipping/zones/:id
 * @access  Private/Vendor
 */
exports.deleteShippingZone = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const zone = await db('shipping_zones')
      .where('id', id)
      .where('vendor_id', vendorId)
      .first();

    if (!zone) throw new AppError('Shipping zone not found', 404);

    await db.transaction(async (trx) => {
      // Delete associated rates
      await trx('shipping_rates').where('zone_id', id).delete();
      // Delete zone
      await trx('shipping_zones').where('id', id).delete();
    });

    successResponse(res, null, 'Shipping zone deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get shipping rates
 * @route   GET /api/vendor/shipping/rates
 * @access  Private/Vendor
 */
exports.getShippingRates = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { zone_id } = req.query;

    let query = db('shipping_rates as sr')
      .join('shipping_zones as sz', 'sr.zone_id', 'sz.id')
      .where('sz.vendor_id', vendorId)
      .select('sr.*', 'sz.name as zone_name');

    if (zone_id) query = query.where('sr.zone_id', zone_id);

    const rates = await query.orderBy('sr.min_weight', 'asc');

    successResponse(res, { rates }, 'Shipping rates retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create shipping rate
 * @route   POST /api/vendor/shipping/rates
 * @access  Private/Vendor
 */
exports.createShippingRate = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { zone_id, name, min_weight, max_weight, cost, estimated_days } = req.body;

    // Verify zone belongs to vendor
    const zone = await db('shipping_zones')
      .where('id', zone_id)
      .where('vendor_id', vendorId)
      .first();

    if (!zone) throw new AppError('Shipping zone not found', 404);

    const [rateId] = await db('shipping_rates').insert({
      zone_id,
      name,
      min_weight,
      max_weight,
      cost,
      estimated_days,
      created_at: db.fn.now()
    });

    const rate = await db('shipping_rates').where('id', rateId).first();
    successResponse(res, { rate }, 'Shipping rate created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update shipping rate
 * @route   PUT /api/vendor/shipping/rates/:id
 * @access  Private/Vendor
 */
exports.updateShippingRate = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Verify rate belongs to vendor's zone
    const rate = await db('shipping_rates as sr')
      .join('shipping_zones as sz', 'sr.zone_id', 'sz.id')
      .where('sr.id', id)
      .where('sz.vendor_id', vendorId)
      .first('sr.*');

    if (!rate) throw new AppError('Shipping rate not found', 404);

    await db('shipping_rates')
      .where('id', id)
      .update({ ...req.body, updated_at: db.fn.now() });

    const updated = await db('shipping_rates').where('id', id).first();
    successResponse(res, { rate: updated }, 'Shipping rate updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete shipping rate
 * @route   DELETE /api/vendor/shipping/rates/:id
 * @access  Private/Vendor
 */
exports.deleteShippingRate = async (req, res, next) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Verify rate belongs to vendor's zone
    const rate = await db('shipping_rates as sr')
      .join('shipping_zones as sz', 'sr.zone_id', 'sz.id')
      .where('sr.id', id)
      .where('sz.vendor_id', vendorId)
      .first('sr.*');

    if (!rate) throw new AppError('Shipping rate not found', 404);

    await db('shipping_rates').where('id', id).delete();
    successResponse(res, null, 'Shipping rate deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available carriers
 * @route   GET /api/vendor/shipping/carriers
 * @access  Private/Vendor
 */
exports.getCarriers = async (req, res, next) => {
  try {
    // Static list of available carriers in West Africa
    const carriers = [
      { id: 'dhl', name: 'DHL Express', tracking_url: 'https://www.dhl.com/tracking' },
      { id: 'fedex', name: 'FedEx', tracking_url: 'https://www.fedex.com/tracking' },
      { id: 'ups', name: 'UPS', tracking_url: 'https://www.ups.com/track' },
      { id: 'aramex', name: 'Aramex', tracking_url: 'https://www.aramex.com/track' },
      { id: 'chronopost', name: 'Chronopost', tracking_url: 'https://www.chronopost.fr/tracking' },
      { id: 'ems', name: 'EMS Post', tracking_url: 'https://www.ems.post/tracking' },
      { id: 'colissimo', name: 'Colissimo', tracking_url: 'https://www.laposte.fr/tracking' },
      { id: 'tnt', name: 'TNT', tracking_url: 'https://www.tnt.com/tracking' },
      { id: 'local', name: 'Livraison Locale', tracking_url: null }
    ];

    successResponse(res, { carriers }, 'Carriers retrieved successfully');
  } catch (error) {
    next(error);
  }
};
