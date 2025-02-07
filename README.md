# Bunios

Bunios is an Axios alternative or fetch wrapper for Bun with a predefined authPlugin that supports refresh tokens.

## Features

- Simple and intuitive API similar to Axios
- Built-in authentication plugin with refresh token support
- Lightweight and fast
- Fully compatible with Bun

## Installation

```bash
bun add bunios
```

## Usage

```javascript
import bunios from "bunios";

// Initialize bunios with your configuration
const apiClient = bunios;

apiClient.use(
  buniosAuth({
    getAccessToken: () => localStorage.getItem("accessToken"),
    setAccessToken: (res) =>
      localStorage.setItem("accessToken", res.data.access_token),
    getRefreshToken: () => localStorage.getItem("refreshToken"),
    setRefreshToken: (res) =>
      localStorage.setItem("refreshToken", res.data.refresh_token),
    maxRefresh: 1,
    onError: console.error,
    onRefreshError: console.error,
    loginPath: "/auth/login",
    refreshPath: "/auth/refresh",
  })
);

// Make a request
apiClient
  .get("/endpoint")
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error);
  });
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
