INSERT INTO users (username, email, password, role, tenantId, createdAt)
VALUES (
  'fleetlogix_admin',
  'admin@fleetlogix.co.za',
  '$2b$10$t8L5RjgQQTqE5KoppCvT9ek.AxG/6Iu8EWTqvP1.wXcBML1WhxlDG',
  'admin',
  1,
  datetime('now')
);
