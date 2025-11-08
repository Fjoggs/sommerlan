INSERT INTO user(name) VALUES('PekkyD');

INSERT INTO game(name) VALUES('CS');

INSERT INTO lan(start_date, end_date, event, description) 
VALUES('2011-01-01', '2011-01-01', 'pre', 'Første lan');

INSERT INTO lan_games(lan_id, game_id) VALUES(1, 1);
INSERT INTO lan_participants(lan_id, user_id) VALUES(1, 1);
