-- Users
INSERT INTO user(name, color) VALUES('PekkyD', '#e74c3c');
INSERT INTO user(name, color) VALUES('Fjoggs', '#3498db');
INSERT INTO user(name, color) VALUES('Krille', '#2ecc71');
INSERT INTO user(name, color) VALUES('Magnar', '#f39c12');
INSERT INTO user(name, color) VALUES('Snupp', '#9b59b6');
INSERT INTO user(name, color) VALUES('Larsp', '#1abc9c');

-- Games
INSERT INTO game(name) VALUES('Counter-Strike 2');
INSERT INTO game(name) VALUES('Rocket League');
INSERT INTO game(name) VALUES('Age of Empires II');
INSERT INTO game(name) VALUES('Minecraft');
INSERT INTO game(name) VALUES('Dota 2');
INSERT INTO game(name) VALUES('Warcraft III');

-- LANs
INSERT INTO lan(start_date, end_date, event, description)
VALUES('2024-06-14', '2024-06-16', 'main', 'Sommerlan 2024 - Hoveddel');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2024-06-13', '2024-06-14', 'pre', 'Sommerlan 2024 - Forlan');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2024-06-16', '2024-06-17', 'side', 'Sommerlan 2024 - Etterfest');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2025-06-20', '2025-06-22', 'main', 'Sommerlan 2025 - Hoveddel');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2025-06-19', '2025-06-20', 'pre', 'Sommerlan 2025 - Forlan');

-- LAN games (lan 1 - main 2024)
INSERT INTO lan_games(lan_id, game_id) VALUES(1, 1);
INSERT INTO lan_games(lan_id, game_id) VALUES(1, 2);
INSERT INTO lan_games(lan_id, game_id) VALUES(1, 3);
INSERT INTO lan_games(lan_id, game_id) VALUES(1, 4);

-- LAN games (lan 2 - pre 2024)
INSERT INTO lan_games(lan_id, game_id) VALUES(2, 1);
INSERT INTO lan_games(lan_id, game_id) VALUES(2, 6);

-- LAN games (lan 3 - side 2024)
INSERT INTO lan_games(lan_id, game_id) VALUES(3, 4);
INSERT INTO lan_games(lan_id, game_id) VALUES(3, 5);

-- LAN games (lan 4 - main 2025)
INSERT INTO lan_games(lan_id, game_id) VALUES(4, 1);
INSERT INTO lan_games(lan_id, game_id) VALUES(4, 2);
INSERT INTO lan_games(lan_id, game_id) VALUES(4, 5);

-- LAN games (lan 5 - pre 2025)
INSERT INTO lan_games(lan_id, game_id) VALUES(5, 1);
INSERT INTO lan_games(lan_id, game_id) VALUES(5, 3);

-- Participants (lan 1 - main 2024, all 6 users)
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 1);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 2);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 3);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 4);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 5);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 6);

-- Participants (lan 2 - pre 2024, 4 early arrivals)
INSERT INTO lan_participants(lan_id, user_id) VALUES(2, 1);
INSERT INTO lan_participants(lan_id, user_id) VALUES(2, 2);
INSERT INTO lan_participants(lan_id, user_id) VALUES(2, 4);
INSERT INTO lan_participants(lan_id, user_id) VALUES(2, 6);

-- Participants (lan 3 - side 2024, 3 diehards)
INSERT INTO lan_participants(lan_id, user_id) VALUES(3, 1);
INSERT INTO lan_participants(lan_id, user_id) VALUES(3, 2);
INSERT INTO lan_participants(lan_id, user_id) VALUES(3, 3);

-- Participants (lan 4 - main 2025, 5 users)
INSERT INTO lan_participants(lan_id, user_id) VALUES(4, 1);
INSERT INTO lan_participants(lan_id, user_id) VALUES(4, 2);
INSERT INTO lan_participants(lan_id, user_id) VALUES(4, 3);
INSERT INTO lan_participants(lan_id, user_id) VALUES(4, 5);
INSERT INTO lan_participants(lan_id, user_id) VALUES(4, 6);

-- Participants (lan 5 - pre 2025, 3 users)
INSERT INTO lan_participants(lan_id, user_id) VALUES(5, 2);
INSERT INTO lan_participants(lan_id, user_id) VALUES(5, 3);
INSERT INTO lan_participants(lan_id, user_id) VALUES(5, 5);

-- LANs 2026 (no participants yet — populated via RSVP)
INSERT INTO lan(start_date, end_date, event, description)
VALUES('2026-07-14', '2026-07-16', 'pre', 'Sommerlan 2026 - Pre-pre-LAN');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2026-07-17', '2026-07-19', 'pre', 'Sommerlan 2026 - Pre-LAN');

INSERT INTO lan(start_date, end_date, event, description)
VALUES('2026-07-20', '2026-07-26', 'main', 'Sommerlan 2026 - Hoveddel');
