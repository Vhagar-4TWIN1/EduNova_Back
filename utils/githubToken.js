const URL_PARAMS = new URLSearchParams(window.location.search);
const TOKEN = URL_PARAMS.get('token');

const show =(selector) =>{
    document.querySelector(selector).style.display='block';
};

const hide = (selector)=>{
    document.querySelector(selector).style.display='hide';
}

if (TOKEN){
    hide('.content.unauthorized');
    show('.content.authorized');
}