/**
 * BloodBridge – Inventory Service (js/services/inventory-service.js)
 * Manages D3 Blood Inventory data store.
 * BloodUnit class operations: async checkExpiry(), async markExpired(), async reserve(), async issue()
 * Fulfills: R.1.3 Manage Blood Inventory, Use Case: Manage Inventory
 */

'use strict';

const InventoryService = {

  // ─── Read ─────────────────────────────────────────────

  /** Get all blood units */
  async getAll() {
    this.flagExpiredUnits(); // auto-flag on every read
    return await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY);
  },

  /** Get a unit by ID */
  async getById(unitId) {
    return await MockData.getById(MockData.STORAGE_KEYS.BLOOD_INVENTORY, 'unitId', unitId);
  },

  /** True if a unit is past its expiry date */
  isExpired(unit) {
    return new Date(unit.expiryDate || unit.expiry_date) < new Date();
  },
  
  _isExpiredSync(unit) {
    return this.isExpired(unit);
  },

  /** True if a unit expires within `days` days */
  isNearExpiry(unit, days = 7) {
    const ms = new Date(unit.expiryDate) - new Date();
    return ms > 0 && ms < days * 86400000;
  },

  /** Get all available (non-expired) units for a blood group */
  async getAvailableByGroup(bloodGroup) {
    return this.getAll().filter(u =>
      u.bloodGroup === bloodGroup &&
      u.unitStatus === 'Available' &&
      !this.isExpired(u)
    );
  },

  /** Total available quantity for a blood group */
  async getTotalAvailable(bloodGroup) {
    return this.getAvailableByGroup(bloodGroup).reduce((s, u) => s + u.quantity, 0);
  },

  /**
   * Stock summary per blood group.
   * Returns [{bloodGroup, available, reserved, issued, expired}]
   */
  async getStockSummary() {
    const all = await this.getAll();
    return ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => {
      const units = all.filter(u => u.bloodGroup === bg || u.blood_group === bg);
      return {
        bloodGroup: bg,
        available:  units.filter(u => (u.unitStatus || u.unit_status) === 'Available' && !this._isExpiredSync(u)).reduce((s,u)=>s+(u.quantity||0),0),
        reserved:   units.filter(u => (u.unitStatus || u.unit_status) === 'Reserved').reduce((s,u)=>s+(u.quantity||0),0),
        issued:     units.filter(u => (u.unitStatus || u.unit_status) === 'Issued').reduce((s,u)=>s+(u.quantity||0),0),
        expired:    units.filter(u => (u.unitStatus || u.unit_status) === 'Expired' || this._isExpiredSync(u)).reduce((s,u)=>s+(u.quantity||0),0)
      };
    });
  },

  // ─── Expiry management ────────────────────────────────

  /**
   * Flag all units past expiry as 'Expired'.
   * Per SRS §7.2: "Blood units nearing or past their expiry date must be automatically flagged."
   */
  async flagExpiredUnits() {
    const units = await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY);
    let changed = false;
    units.forEach(u => {
      if ((u.unitStatus === 'Available' || u.unitStatus === 'Reserved') && this.isExpired(u)) {
        u.unitStatus = 'Expired';
        changed = true;
      }
    });
    if (changed) MockData.saveAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY, units);
  },

  // ─── CRUD ─────────────────────────────────────────────

  /** Add new blood units to inventory (Admin: R.1.3) */
  async addUnit({ bloodGroup, quantity, collectionDate, expiryDate }) {
    const unit = {
      unitId:             MockData.generateId('UNIT'),
      bloodGroup,
      quantity:           parseInt(quantity, 10),
      collectionDate,
      expiryDate,
      unitStatus:         'Available',
      reservedForRequest: null
    };
    MockData.add(MockData.STORAGE_KEYS.BLOOD_INVENTORY, unit);
    await ActivityLogService.logInventoryUpdate(unit.unitId, bloodGroup, quantity, 'Added');
    return unit;
  },

  /** Update a blood unit record */
  async updateUnit(unitId, updates) {
    const updated = await MockData.update(MockData.STORAGE_KEYS.BLOOD_INVENTORY, 'unitId', unitId, updates);
    if (updated) await ActivityLogService.logInventoryUpdate(unitId, updated.bloodGroup, updated.quantity, 'Updated');
    return updated;
  },

  /** Remove a blood unit from inventory */
  async removeUnit(unitId) {
    const unit = this.getById(unitId);
    if (unit) {
      MockData.remove(MockData.STORAGE_KEYS.BLOOD_INVENTORY, 'unitId', unitId);
      await ActivityLogService.logInventoryUpdate(unitId, unit.bloodGroup, unit.quantity, 'Removed');
    }
  },

  // ─── Reservation & Issuance ───────────────────────────

  /**
   * Reserve units for a blood request.
   * Finds available units with sufficient quantity, marks them Reserved.
   * @returns {boolean} true if reservation successful
   */
  async reserveUnitsForRequest(bloodGroup, quantity, requestId) {
    const units = await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY);
    let remaining = parseInt(quantity, 10);

    for (const unit of units) {
      if (unit.bloodGroup !== bloodGroup) continue;
      if (unit.unitStatus !== 'Available') continue;
      if (this.isExpired(unit)) continue;
      if (remaining <= 0) break;

      if (unit.quantity <= remaining) {
        // Reserve entire unit
        remaining -= unit.quantity;
        unit.unitStatus = 'Reserved';
        unit.reservedForRequest = requestId;
      } else {
        // Partially reserve – split into two entries
        const reserved = {
          unitId:             MockData.generateId('UNIT'),
          bloodGroup:         unit.bloodGroup,
          quantity:           remaining,
          collectionDate:     unit.collectionDate,
          expiryDate:         unit.expiryDate,
          unitStatus:         'Reserved',
          reservedForRequest: requestId
        };
        unit.quantity -= remaining;
        remaining = 0;
        units.push(reserved);
      }
    }

    MockData.saveAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY, units);
    return remaining === 0;
  },

  /**
   * Release reserved units back to Available (on rejection/cancellation).
   * async dispatchBlood() counterpart for rejected path.
   */
  async releaseReservedUnits(requestId) {
    const units = (await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY)).map(u => {
      if (u.reservedForRequest === requestId) {
        return { ...u, unitStatus: 'Available', reservedForRequest: null };
      }
      return u;
    });
    MockData.saveAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY, units);
  },

  /**
   * Deduct (issue) reserved units after approval & dispatch.
   * Marks matching reserved units as 'Issued'.
   */
  async issueUnitsForRequest(requestId, bloodGroup, quantity) {
    const units = await MockData.getAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY);
    let remaining = parseInt(quantity, 10);

    for (const unit of units) {
      if (unit.reservedForRequest !== requestId) continue;
      if (remaining <= 0) break;

      if (unit.quantity <= remaining) {
        remaining -= unit.quantity;
        unit.unitStatus = 'Issued';
        unit.reservedForRequest = null;
      } else {
        // Issue part, keep the rest as available
        const issued = {
          unitId:             MockData.generateId('UNIT'),
          bloodGroup:         unit.bloodGroup,
          quantity:           remaining,
          collectionDate:     unit.collectionDate,
          expiryDate:         unit.expiryDate,
          unitStatus:         'Issued',
          reservedForRequest: null
        };
        unit.quantity -= remaining;
        unit.unitStatus = 'Available';
        unit.reservedForRequest = null;
        remaining = 0;
        units.push(issued);
      }
    }

    MockData.saveAll(MockData.STORAGE_KEYS.BLOOD_INVENTORY, units);
    await ActivityLogService.logUnitStatusChange(requestId, bloodGroup, 'Reserved', 'Issued');
  }
};
