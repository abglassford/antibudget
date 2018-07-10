const db = require('../db');
const errors = require('./errors');

module.exports = {
  create: (entityName, parentEntity, parentIdParam) =>
    async (req, res) => {
      let data = req.body;

      if (parentEntity) {
        const parentId = req.params[parentIdParam];
        const parent = await db.select()
          .from(parentEntity)
          .where({ id: parentId });

        if (!parent.length) {
          throw new errors.NotFound('Parent Entity not found');
        }

        if (Array.isArray(data)) {
          data = data.map(x => ({
            ...x,
            [parentIdParam]: parentId,
          }));
        } else {
          data[parentIdParam] = parentId;
        }
      }

      const sql = db(entityName)
        .insert(data)
        .toString();

      const result = await db.raw(`
        ${sql}
        ON CONFLICT DO NOTHING
        RETURNING *
      `).then(result => result.rows);

      if (Array.isArray(data)) {
        return result;
      }

      return result[0];
    },
  read: (entityName, parentIdParam) =>
    async (req, res) => {
      if (parentIdParam) {
        const parentId = req.params[parentIdParam];
        return db.select()
          .from(entityName)
          .where({ [parentIdParam]: parentId });
      }

      const id = req.params.id;
      if (id) {
        return db.select()
          .from(entityName)
          .where({ id })
          .then(x => x[0]);
      }
      return db.select()
        .from(entityName);
    },
  update: (entityName) =>
    async (req, res) => {
      const id = req.params.id;
      const entity = await db
        .select()
        .from(entityName)
        .where({ id })
        .then(x => x[0]);

      if (!entity) {
        throw new errors.NotFound('Entity not found');
      }

      return db(entityName)
        .update(req.body)
        .where({ id })
        .returning('*')
        .then(x => x[0]);
    },
};
