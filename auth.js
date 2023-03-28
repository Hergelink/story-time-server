const jwt = require('jsonwebtoken');

module.exports = async (request, response, next) => {
  try {
    //   get the token from cookies
    const { token } = request.cookies;

    //check if the token matches the supposed origin
    const decodedToken = await jwt.verify(token, process.env.SECRET);

    // retrieve the user details of the logged in user
    const user = decodedToken;

    // pass the the user down to the endpoints here
    request.user = user;

    // pass down functionality to the endpoint
    next();
  } catch (error) {
    response.status(401).json({
      error: new Error('Invalid request!'),
    });
  }
};
