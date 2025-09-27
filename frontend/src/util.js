window.configs = {
    apiUrl: 'https://acf87dfe-494a-450d-830c-fb0b0ad24134-prod.e1-us-east-azure.choreoapis.dev/myuni-tn/backend/v1',
};

const apiUrl = window?.configs?.apiUrl ? window.configs.apiUrl : "/";

export const API_BASE_URL = apiUrl
