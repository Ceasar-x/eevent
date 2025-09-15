function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden - Required role: ${roles.join(" or ")}, Your role: ${
          req.user.role
        }`,
      });
    }

    next();
  };
}

module.exports = { allowRoles };
