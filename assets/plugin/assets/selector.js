/**
 * QatamaCR Core: desplegable con estilo de marca para los <select> del formulario.
 *
 * Mejora progresiva: sin JavaScript se usa el <select> nativo (también con estilo propio).
 * Con JavaScript se crea un combobox "solo selección" siguiendo el patrón WAI-ARIA APG:
 * - el <select> original sigue en el formulario (oculto) y es el que se envía;
 * - teclado: Enter/Espacio/Alt+↓ abren, ↑ ↓ Inicio Fin RePág AvPág mueven, Enter/Espacio/Tab eligen,
 *   Esc cierra, y escribir letras salta a la opción que empieza por ellas.
 */
( function () {
	'use strict';

	var contador = 0;

	function mejorar( select ) {
		if ( select.dataset.qcrMejorado || select.multiple ) {
			return;
		}
		select.dataset.qcrMejorado = '1';
		contador++;

		var id = select.id || 'qcr-select-' + contador;
		var label = select.id ? document.querySelector( 'label[for="' + select.id + '"]' ) : null;
		if ( label && ! label.id ) {
			label.id = id + '-label';
		}

		var cont = document.createElement( 'div' );
		cont.className = 'qcr-selector';

		var combo = document.createElement( 'div' );
		combo.className = 'qcr-selector__boton';
		combo.id = id + '-combo';
		combo.setAttribute( 'role', 'combobox' );
		combo.setAttribute( 'tabindex', '0' );
		combo.setAttribute( 'aria-haspopup', 'listbox' );
		combo.setAttribute( 'aria-expanded', 'false' );
		combo.setAttribute( 'aria-controls', id + '-lista' );
		if ( label ) {
			combo.setAttribute( 'aria-labelledby', label.id );
		}
		[ 'aria-describedby', 'aria-invalid', 'aria-required' ].forEach( function ( a ) {
			if ( select.hasAttribute( a ) ) {
				combo.setAttribute( a, select.getAttribute( a ) );
			}
		} );

		var valor = document.createElement( 'span' );
		valor.className = 'qcr-selector__valor';
		combo.appendChild( valor );

		var flecha = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
		flecha.setAttribute( 'class', 'qcr-selector__flecha' );
		flecha.setAttribute( 'viewBox', '0 0 20 20' );
		flecha.setAttribute( 'aria-hidden', 'true' );
		flecha.setAttribute( 'focusable', 'false' );
		flecha.innerHTML = '<path d="M4.5 7.5 10 13l5.5-5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
		combo.appendChild( flecha );

		var lista = document.createElement( 'ul' );
		lista.className = 'qcr-selector__lista';
		lista.id = id + '-lista';
		lista.setAttribute( 'role', 'listbox' );
		lista.setAttribute( 'tabindex', '-1' );
		if ( label ) {
			lista.setAttribute( 'aria-labelledby', label.id );
		}
		lista.hidden = true;

		var opciones = Array.prototype.map.call( select.options, function ( o, i ) {
			var li = document.createElement( 'li' );
			li.className = 'qcr-selector__opcion' + ( o.value === '' ? ' is-vacia' : '' );
			li.id = id + '-op-' + i;
			li.setAttribute( 'role', 'option' );
			li.textContent = o.textContent;
			if ( o.disabled ) {
				li.setAttribute( 'aria-disabled', 'true' );
			}
			lista.appendChild( li );
			return li;
		} );

		select.parentNode.insertBefore( cont, select );
		cont.appendChild( select );
		cont.appendChild( combo );
		cont.appendChild( lista );
		select.classList.add( 'qcr-selector__nativo' );
		select.setAttribute( 'tabindex', '-1' );
		select.setAttribute( 'aria-hidden', 'true' );
		cont.classList.add( 'is-mejorado' );

		var activo = select.selectedIndex < 0 ? 0 : select.selectedIndex;
		var busqueda = '';
		var temporizador;

		function abierto() {
			return combo.getAttribute( 'aria-expanded' ) === 'true';
		}

		function pintarValor() {
			var o = select.options[ select.selectedIndex ];
			valor.textContent = o ? o.textContent : '';
			cont.classList.toggle( 'is-vacio', ! o || o.value === '' );
			opciones.forEach( function ( li, i ) {
				li.setAttribute( 'aria-selected', i === select.selectedIndex ? 'true' : 'false' );
			} );
		}

		function marcar( i, desplazar ) {
			activo = Math.max( 0, Math.min( opciones.length - 1, i ) );
			opciones.forEach( function ( li, j ) {
				li.classList.toggle( 'is-activa', j === activo );
			} );
			combo.setAttribute( 'aria-activedescendant', opciones[ activo ].id );
			if ( desplazar ) {
				var li = opciones[ activo ];
				if ( li.offsetTop < lista.scrollTop ) {
					lista.scrollTop = li.offsetTop;
				} else if ( li.offsetTop + li.offsetHeight > lista.scrollTop + lista.clientHeight ) {
					lista.scrollTop = li.offsetTop + li.offsetHeight - lista.clientHeight;
				}
			}
		}

		function abrir() {
			if ( abierto() ) {
				return;
			}
			lista.hidden = false;
			combo.setAttribute( 'aria-expanded', 'true' );
			cont.classList.add( 'is-abierto' );
			// Si no cabe por debajo, se abre hacia arriba.
			var r = combo.getBoundingClientRect();
			var alto = Math.min( lista.scrollHeight, parseFloat( getComputedStyle( lista ).maxHeight ) || 400 );
			cont.classList.toggle( 'is-arriba', window.innerHeight - r.bottom < alto + 16 && r.top > alto + 16 );
			marcar( select.selectedIndex < 0 ? 0 : select.selectedIndex, true );
		}

		function cerrar() {
			if ( ! abierto() ) {
				return;
			}
			lista.hidden = true;
			combo.setAttribute( 'aria-expanded', 'false' );
			combo.removeAttribute( 'aria-activedescendant' );
			cont.classList.remove( 'is-abierto', 'is-arriba' );
		}

		function elegir( i ) {
			if ( opciones[ i ].getAttribute( 'aria-disabled' ) === 'true' ) {
				return;
			}
			var cambia = select.selectedIndex !== i;
			select.selectedIndex = i;
			pintarValor();
			if ( cambia ) {
				select.dispatchEvent( new Event( 'change', { bubbles: true } ) );
			}
		}

		function buscar( letra ) {
			clearTimeout( temporizador );
			busqueda += letra.toLowerCase();
			temporizador = setTimeout( function () {
				busqueda = '';
			}, 600 );
			var norm = function ( t ) {
				return t.toLowerCase().normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' );
			};
			var q = norm( busqueda );
			var orden = opciones.slice( activo + 1 ).concat( opciones.slice( 0, activo + 1 ) );
			if ( busqueda.length > 1 ) {
				orden = opciones.slice( activo ).concat( opciones.slice( 0, activo ) );
			}
			for ( var k = 0; k < orden.length; k++ ) {
				if ( norm( orden[ k ].textContent ).indexOf( q ) === 0 ) {
					return opciones.indexOf( orden[ k ] );
				}
			}
			return -1;
		}

		combo.addEventListener( 'click', function () {
			if ( abierto() ) {
				cerrar();
			} else {
				abrir();
			}
		} );

		combo.addEventListener( 'keydown', function ( e ) {
			var k = e.key;
			if ( ! abierto() ) {
				if ( k === 'Enter' || k === ' ' || k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End' ) {
					e.preventDefault();
					abrir();
					if ( k === 'Home' ) {
						marcar( 0, true );
					} else if ( k === 'End' ) {
						marcar( opciones.length - 1, true );
					}
					return;
				}
			} else {
				switch ( k ) {
					case 'ArrowDown':
						e.preventDefault();
						if ( e.altKey ) {
							return;
						}
						marcar( activo + 1, true );
						return;
					case 'ArrowUp':
						e.preventDefault();
						if ( e.altKey ) {
							elegir( activo );
							cerrar();
							return;
						}
						marcar( activo - 1, true );
						return;
					case 'Home':
						e.preventDefault();
						marcar( 0, true );
						return;
					case 'End':
						e.preventDefault();
						marcar( opciones.length - 1, true );
						return;
					case 'PageDown':
						e.preventDefault();
						marcar( activo + 5, true );
						return;
					case 'PageUp':
						e.preventDefault();
						marcar( activo - 5, true );
						return;
					case 'Enter':
					case ' ':
						if ( k === ' ' && busqueda ) {
							break;
						}
						e.preventDefault();
						elegir( activo );
						cerrar();
						return;
					case 'Escape':
						e.preventDefault();
						cerrar();
						return;
					case 'Tab':
						elegir( activo );
						cerrar();
						return;
				}
			}
			if ( k.length === 1 && ! e.ctrlKey && ! e.metaKey && ! e.altKey ) {
				var i = buscar( k );
				if ( i > -1 ) {
					e.preventDefault();
					if ( abierto() ) {
						marcar( i, true );
					} else {
						elegir( i );
						activo = i;
					}
				}
			}
		} );

		combo.addEventListener( 'blur', function ( e ) {
			if ( ! cont.contains( e.relatedTarget ) ) {
				cerrar();
			}
		} );

		lista.addEventListener( 'mousedown', function ( e ) {
			// Mantener el foco en el combobox al pulsar una opción.
			e.preventDefault();
		} );
		lista.addEventListener( 'click', function ( e ) {
			var li = e.target.closest( '.qcr-selector__opcion' );
			if ( li ) {
				elegir( opciones.indexOf( li ) );
				cerrar();
				combo.focus();
			}
		} );
		lista.addEventListener( 'mousemove', function ( e ) {
			var li = e.target.closest( '.qcr-selector__opcion' );
			if ( li && opciones.indexOf( li ) !== activo ) {
				marcar( opciones.indexOf( li ), false );
			}
		} );

		document.addEventListener( 'pointerdown', function ( e ) {
			if ( ! cont.contains( e.target ) ) {
				cerrar();
			}
		} );

		// Pulsar la etiqueta lleva al desplegable nuevo.
		if ( label ) {
			label.addEventListener( 'click', function ( e ) {
				e.preventDefault();
				combo.focus();
			} );
		}

		// Si el formulario se reinicia o algo cambia el select por código.
		select.addEventListener( 'change', pintarValor );
		if ( select.form ) {
			select.form.addEventListener( 'reset', function () {
				setTimeout( pintarValor, 0 );
			} );
		}

		pintarValor();
	}

	function iniciar() {
		document.querySelectorAll( '.qcr-form select' ).forEach( mejorar );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', iniciar );
	} else {
		iniciar();
	}
} )();
