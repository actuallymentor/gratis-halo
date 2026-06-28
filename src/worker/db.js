/**
 * Runs a D1 query and returns all rows.
 * @param {D1Database} db - D1 binding.
 * @param {string} sql - SQL statement.
 * @param {Array} bindings - SQL bindings.
 * @returns {Promise<Array>} Result rows.
 */
export async function all_rows( db, sql, bindings = [] ) {

    const result = await db.prepare( sql ).bind( ...bindings ).all()

    return result.results || []
}

/**
 * Runs a D1 query and returns the first row.
 * @param {D1Database} db - D1 binding.
 * @param {string} sql - SQL statement.
 * @param {Array} bindings - SQL bindings.
 * @returns {Promise<Object|null>} First row.
 */
export async function first_row( db, sql, bindings = [] ) {

    return db.prepare( sql ).bind( ...bindings ).first()
}

/**
 * Runs a D1 write statement.
 * @param {D1Database} db - D1 binding.
 * @param {string} sql - SQL statement.
 * @param {Array} bindings - SQL bindings.
 * @returns {Promise<Object>} D1 run result.
 */
export async function run_query( db, sql, bindings = [] ) {

    return db.prepare( sql ).bind( ...bindings ).run()
}

/**
 * Generates a stable application id.
 * @returns {string} UUID.
 */
export function new_id() {

    return crypto.randomUUID()
}

