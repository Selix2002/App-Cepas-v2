// src/utils/loader.ts
import  loaderGif  from '../assets/img/loader.gif';
export function loader(show: boolean, gifUrl = loaderGif): void {
  const ID = 'global-loader';

  let el = document.getElementById(ID);

  if (!el) {
    el = document.createElement('div');
    el.id = ID;
    Object.assign(el.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: '9999',
    });

    const img = document.createElement('img');
    img.src = gifUrl;
    img.alt = 'Cargando...';
    Object.assign(img.style, {
      width: '80px',
      height: '80px',
    });
    el.appendChild(img);
    document.body.appendChild(el);
  } 

  el.style.display = show ? 'flex' : 'none';
}
