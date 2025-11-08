SELECT
    lan.start_date,
    lan.end_date,
    lan.event,
    lan.description,
    user.name AS participant_name,
    game.name AS game_name
FROM lan
    JOIN lan_games ON lan.id = lan_games.lan_id
    JOIN game ON lan_games.game_id = game.id
    JOIN lan_participants ON lan.id = lan_participants.lan_id
    JOIN user ON lan_participants.user_id = user.id;

-- Get paricipants of a lan
SELECT
    user.name AS participant
FROM lan
    JOIN lan_participants ON lan.id = lan_participants.lan_id
    JOIN user ON lan_participants.user_id = user.id
    WHERE lan.id = ?;


-- Get games of a lan
SELECT
    game.name AS lan_game
FROM lan
    JOIN lan_games ON lan.id = lan_games.lan_id
    JOIN game ON lan_games.game_id = game.id
    WHERE lan.id = ?;
