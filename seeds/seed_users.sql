DO $$
BEGIN
    IF (SELECT COUNT(*) FROM users) < 100000 THEN

        INSERT INTO users (name, email, created_at, updated_at, is_deleted)
        SELECT
            'User ' || gs,
            'user' || gs || '@example.com',
            NOW() - (random() * interval '30 days'),
            NOW() - (random() * interval '30 days'),
            random() < 0.01
        FROM generate_series(1,100000) AS gs;

    END IF;
END $$;