cat << 'EOF' > scripts/fetch-tires.js
const soap = require('soap');
const url = 'https://api-b2b.4tochki.ru/WCF/ClientService.svc?wsdl';

const login = 'ТВОЙ_ЛОГИН';
const password = 'ТВОЙ_ПАРОЛЬ';

async function getTires() {
    try {
        console.log('Подключаемся к API...');
        const client = await soap.createClientAsync(url);
        
        console.log('Авторизация и запрос шин...');
        const args = {
            login: login,
            password: password,
            filter: {},
            page: 0,
            pageSize: 5
        };

        const [result] = await client.GetFindTyreAsync(args);
        console.log('УСПЕХ! Вот первые данные:');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('ОШИБКА:', err.message);
    }
}
getTires();