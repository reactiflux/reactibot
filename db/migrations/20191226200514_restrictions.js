exports.up = function(knex) {
  return knex.schema.createTable("restrictions", function(table) {
    table.increments("id");
    table.string("user_id").notNullable();
    table.datetime("start_time");
    table.datetime("end_time");
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("restrictions");
};
