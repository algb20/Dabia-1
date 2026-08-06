import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
  			serif: ['Georgia', 'ui-serif', 'serif'],
  		},
  		colors: {
  			// The app was built with hard-coded `amber-*` utilities as its accent.
  			// Rather than rewrite ~500 call sites, the scale itself is remapped to
  			// the Discover site's restrained brass, so the whole app inherits the
  			// refined tone against the new verdigris base. Dabia's gold identity
  			// is kept — it is simply no longer neon.
  			amber: {
  				50:  '#faf6ec',
  				100: '#f3ecd6',
  				200: '#e9dcb2',
  				300: '#dcc584',
  				400: '#d3ad57',
  				500: '#c0973f',
  				600: '#a37c2c',
  				700: '#8f7016',
  				800: '#6d551a',
  				900: '#5a4719',
  				950: '#33270c',
  			},
  			// Blue read as a foreign accent against verdigris + brass. It is
  			// remapped to the site's periwinkle (`--pi`), which the site reserves
  			// for Pi identity — giving the app the same three-colour system:
  			// verdigris (primary) · brass (seal) · periwinkle (Pi / info).
  			blue: {
  				50:  '#f0eefc',
  				100: '#ece9fb',
  				200: '#d8d2f7',
  				300: '#bcb2f2',
  				400: '#9c8cff',
  				500: '#7c68f0',
  				600: '#5b45e0',
  				700: '#4a37bd',
  				800: '#3b2c96',
  				900: '#2f2477',
  				950: '#191534',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
