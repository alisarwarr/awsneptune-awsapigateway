//AXIOS
import axios from 'axios';


export async function handler() {
    try {
        // neptune endpoint
        const neptuneEndpoint = process.env.NEPTUNE_ENDPOINT;

        // cypher query
        const query = 'MATCH (n) RETURN n';

        // make a POST request to Neptune openCypher endpoint
        const response = await axios.post(`HTTPS://${neptuneEndpoint}:8182/openCypher`, `query=${query}`);

        // transform the data
        const transformedData = response.data.results.map((item: any) => {
            const { '~id': id, '~labels': [label], '~properties': properties } = item.n;
            return { id, label, properties };
        });

        // return a successful response to the client
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transformedData)
        }
    }
    catch (error: any) {
        // return an error response to the client
        return {
            statusCode: error.response?.status || 500, // Use the status code from the error response if available
            headers: { "Content-Type": "text/plain" },
            body: error.message || "An error occurred", // Use the error message from the response if available
        }
    }
}