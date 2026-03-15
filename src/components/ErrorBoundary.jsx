import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Dialectix] Uncaught error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        height:         '100vh',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        alignItems:     'center',
        background:     '#f8f6f2',
      }}>
        <h1 style={{
          fontSize:     28,
          fontWeight:   600,
          marginBottom: 10,
        }}>
          Une erreur est survenue
        </h1>

        <p style={{
          opacity:      0.7,
          marginBottom: 20,
        }}>
          Dialectix a rencontré un problème inattendu. Vous pouvez recharger la page.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding:      '10px 18px',
            borderRadius: 8,
            border:       'none',
            background:   '#1f2937',
            color:        'white',
            cursor:       'pointer',
          }}
        >
          Recharger l'application
        </button>
      </div>
    );
  }
}
