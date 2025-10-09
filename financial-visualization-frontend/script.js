class FinancialVisualization {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api/finances';
        this.chart = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        const uploadForm = document.getElementById('uploadForm');
        uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
    }

    async handleUpload(e) {
        e.preventDefault();

        const userId = document.getElementById('userId').value;
        const year = document.getElementById('year').value;
        const fileInput = document.getElementById('file');
        const uploadBtn = document.getElementById('uploadBtn');

        if (!fileInput.files.length) {
            this.showMessage('Please select a file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        try {
            const response = await fetch(`${this.baseUrl}/upload/${userId}/${year}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed');

            this.showMessage(result.message, 'success');
            setTimeout(() => this.fetchAndDisplayData(userId, year), 1000);
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload and Process';
        }
    }

    async fetchAndDisplayData(userId, year) {
        const dashboard = document.getElementById('dashboard');
        dashboard.style.display = 'block';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Loading data...';
        dashboard.appendChild(loadingDiv);

        try {
            const response = await fetch(`${this.baseUrl}/${userId}/${year}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch data');

            loadingDiv.remove();
            this.displayData(data);
        } catch (error) {
            console.error('Fetch error:', error);
            loadingDiv.remove();
            this.showMessage('Failed to load data: ' + error.message, 'error');
        }
    }

    displayData(data) {
        document.getElementById('userInfo').textContent = `Financial Data - ${data.user.name}`;
        document.getElementById('yearInfo').textContent = `Year: ${data.year}`;
        this.updateTable(data.records);
        this.updateChart(data.records);
    }

    updateTable(records) {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = '';

        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.month}</td>
                <td>$${parseFloat(record.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateChart(records) {
        const ctx = document.getElementById('financialChart').getContext('2d');
        if (this.chart) this.chart.destroy();

        const months = records.map(record => record.month);
        const amounts = records.map(record => record.amount);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Amount ($)',
                    data: amounts,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount ($)' },
                        ticks: {
                            callback: value => '$' + value.toLocaleString()
                        }
                    },
                    x: {
                        title: { display: true, text: 'Month' }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `Amount: $${context.parsed.y.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}`
                        }
                    }
                }
            }
        });
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('uploadMessage');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;

        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FinancialVisualization();
});
