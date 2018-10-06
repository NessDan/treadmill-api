const loggerMiddleware = (req, _res, next) => {
    const logMessage = {
        date: Date.now(),
        endpoint: req.path,
        params: req.params,
        query: req.query,
        body: req.body,
    };

    console.log(logMessage);
    next();
}

module.exports = loggerMiddleware;