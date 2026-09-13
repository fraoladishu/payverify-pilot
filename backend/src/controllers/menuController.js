const db = require('../config/database');

exports.getMenuItems = async (req, res) => {
  try {
    const items = db.store ? db.store.menu_items || [] : [];
    res.json({ success: true, items });
  } catch (err) {
    console.error('Get menu error:', err);
    res.status(500).json({ success: false, message: 'Failed to load custom menu items.' });
  }
};

exports.saveMenuItem = async (req, res) => {
  try {
    const { name, price, category } = req.body;
    if (!name || !price || parseFloat(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Item name and valid price are required.' });
    }

    const cleanName = name.trim();
    const numPrice = parseFloat(price);
    const validCategory = ['Food', 'Drinks', 'Other'].includes(category) ? category : 'Food';

    if (!db.store.menu_items) {
      db.store.menu_items = [];
    }

    // Check if item already exists (case-insensitive) - update price if exists
    const existingIndex = db.store.menu_items.findIndex(
      i => i.name.toLowerCase() === cleanName.toLowerCase() && i.category === validCategory
    );

    let savedItem;
    if (existingIndex >= 0) {
      db.store.menu_items[existingIndex].price = numPrice;
      savedItem = db.store.menu_items[existingIndex];
      console.log(`[Menu] Updated price for '${cleanName}' to ${numPrice} ETB`);
    } else {
      const newId = (db.store.menu_items.length > 0 ? Math.max(...db.store.menu_items.map(i => i.id || 0)) : 0) + 1;
      savedItem = {
        id: newId,
        name: cleanName,
        price: numPrice,
        category: validCategory,
        created_at: new Date().toISOString()
      };
      db.store.menu_items.push(savedItem);
      console.log(`[Menu] Added new custom item '${cleanName}' (${numPrice} ETB) to ${validCategory}`);
    }

    db.saveJSONStore();

    res.json({
      success: true,
      message: 'Custom menu item saved for future use.',
      item: savedItem,
      items: db.store.menu_items
    });
  } catch (err) {
    console.error('Save menu item error:', err);
    res.status(500).json({ success: false, message: 'Failed to save menu item.' });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!db.store.menu_items) {
      return res.json({ success: true, items: [] });
    }

    db.store.menu_items = db.store.menu_items.filter(i => String(i.id) !== String(id));
    db.saveJSONStore();

    res.json({
      success: true,
      message: 'Menu item deleted.',
      items: db.store.menu_items
    });
  } catch (err) {
    console.error('Delete menu item error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
  }
};
