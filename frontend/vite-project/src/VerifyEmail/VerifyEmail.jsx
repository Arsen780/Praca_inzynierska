import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Paper, Typography, CircularProgress, Alert, Button, Stack } from '@mui/material';

const API_URL = "https://localhost:7156";

function VerifyEmail() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Brak tokena weryfikacyjnego w adresie URL.');
            setLoading(false);
            return;
        }

        const verify = async () => {
            try {
                const response = await fetch(`${API_URL}/api/users/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Wystąpił nieznany błąd podczas weryfikacji.');
                }
                setSuccess(data.message || "Konto pomyślnie zweryfikowane!");
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        verify();
    }, [token]);

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Paper elevation={6} sx={{ p: 4, textAlign: 'center' }}>
                <Stack spacing={3} alignItems="center">
                    <Typography variant="h5" component="h1" gutterBottom>
                        Weryfikacja konta
                    </Typography>

                    {loading && (
                        <Box sx={{ py: 3 }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 1 }}>Weryfikowanie...</Typography>
                        </Box>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
                    )}
                    
                    {success && (
                        <>
                            <Alert severity="success" sx={{ width: '100%' }}>{success}</Alert>
                            <Button component={RouterLink} to="/Login" variant="contained" size="large">
                                Przejdź do logowania
                            </Button>
                        </>
                    )}
                </Stack>
            </Paper>
        </Container>
    );
}

export default VerifyEmail;