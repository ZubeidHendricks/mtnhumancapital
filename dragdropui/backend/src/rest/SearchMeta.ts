import { Router } from 'express';

export const SearchMetaRouter = Router();

SearchMetaRouter.get('/', (req, res) => {
    res.json({ results: [] });
});
