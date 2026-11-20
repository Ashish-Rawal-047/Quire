"""Domain services. Each takes an AsyncSession and an explicit `now`, flushes but never commits:
the caller owns the transaction. HTTP routes arrive with authentication (M1 onwards)."""
