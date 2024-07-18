require("dotenv").config();

const express = require("express");
const session = require('express-session');
const {json} = require("body-parser");
const cors = require("cors");
const {obtenerUsuario, obtenerPerfil, reviews ,crearReview, editarReview, borrarReview} = require("./db");
const axios = require('axios');


//Conexion a nuestro servidor
const servidor = express();

servidor.use(cors());

servidor.use(json());

servidor.use(session({
    secret: 'outdbox',
    resave: true,
    saveUninitialized: false // Guarda las sesiones aunque no estén inicializadas
}));

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

// Ruta para obtener lista de géneros de películas desde TMDb
servidor.get('/api/genres', async (peticion, respuesta) => {
    try {
        const response = await axios.get(`${TMDB_API_BASE_URL}/genre/movie/list`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
            },
        });

        respuesta.json(response.data.genres);
    } catch (error) {
        console.error('Error fetching genres from TMDb:', error.message);
        respuesta.status(500).json({ error: 'Error fetching genres from TMDb' });
    }
});

// Ruta para obtener películas populares desde TMDb
servidor.get('/api/popular_movies', async (peticion, respuesta) => {
    try {
      // Realiza la solicitud a la API de TMDb para obtener las películas populares
      const response = await axios.get(`${TMDB_API_BASE_URL}/movie/popular`, {
        params: {
          api_key: TMDB_API_KEY,
          language: 'en-US',
        },
      });
  
      // Extrae y devuelve solo los datos de las películas desde la respuesta
      respuesta.json(response.data.results);
    } catch (error) {
      console.error('Error fetching popular movies from TMDb:', error.message);
      respuesta.status(500).json({ error: 'Error fetching popular movies from TMDb' });
    }
  });

// Ruta para obtener películas en cartelera desde TMDb
servidor.get('/api/now_playing_movies', async (peticion, respuesta) => {
    try {
        const response = await axios.get(`${TMDB_API_BASE_URL}/movie/now_playing`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
                page: peticion.query.page || 1, // Página opcional desde el frontend, default: 1
            },
        });

        respuesta.json(response.data.results);
    } catch (error) {
        console.error('Error fetching now playing movies from TMDb:', error.message);
        respuesta.status(500).json({ error: 'Error fetching now playing movies from TMDb' });
    }
});


servidor.get('/api/movie/:id', async (peticion, respuesta) => {
    const movieId = peticion.params.id;
    try {
        const response = await axios.get(`${TMDB_API_BASE_URL}/movie/${movieId}`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
            },
        });
        respuesta.json(response.data);
    } catch (error) {
        console.error('Error fetching movie details:', error.message);
        respuesta.status(500).json({ error: 'Error fetching movie details' });
    }
});


servidor.get('/api/movie/:id/recommendations', async (peticion, respuesta) => {
    const movieId = peticion.params.id;
    try {
        const response = await axios.get(`${TMDB_API_BASE_URL}/movie/${movieId}/recommendations`, {
            params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
                page: 1,
            },
        });
        respuesta.json(response.data); // Limitar a 5 recomendaciones como en el frontend
    } catch (error) {
        console.error('Error fetching recommendations:', error.message);
        respuesta.status(500).json({ error: 'Error fetching recommendations' });
    }
});


//Acceder a las reseñas 
servidor.get("/reviews", async (peticion, respuesta) => {
    try{
        let review = await reviews();

        respuesta.json(review);

    }catch(error){
        respuesta.status(500);

        respuesta.json(error);
    }
});


// Middleware para crear una nueva review
servidor.post("/reviews/nueva", async (peticion, respuesta) => {
    // Verificar si se proporciona la información necesaria en el cuerpo de la solicitud
    if (!peticion.body.userId || !peticion.body.movieId || !peticion.body.review || !peticion.body.rating) {
        return respuesta.status(400).json({ error: 'Faltan datos requeridos para crear la reseña' });
    }

    try {
        // Extraer los datos de la solicitud
        const { userId, movieId, review, rating } = peticion.body;
        const favorite = peticion.body.favorite || false; // Proporcionar un valor predeterminado de false

        // Crear una nueva review usando la función crearReview
        const insertedId = await crearReview(userId, movieId, review, rating, favorite);

        // Responder con el ID de la review creada
        respuesta.status(201).json({ id: insertedId });
    } catch (error) {
        // Manejar errores y responder con un código de estado 500 y el mensaje de error
        console.error('Error al crear la review:', error);
        respuesta.status(500).json({ error: "Error en el servidor al crear la review", details: error });
    }
});

    //Middleware de actualizar id
    servidor.put("/reviews/actualizar/:id", async (peticion, respuesta) => {
        const { review, rating, favorite } = peticion.body;
        const id = peticion.params.id;
            
        if (!id || !review || review.trim() === "" || !rating || favorite === undefined) {
          return respuesta.status(400).json({ error: "Please add a valid review" });
        }
      
        try {
          let modifiedCount = await editarReview(id, review, rating, favorite);
          respuesta.json({ resultado: modifiedCount ? "ok" : "ko" });
        } catch (error) {
          console.error('Error en BBDD al actualizar la review:', error);
          respuesta.status(500).json({ error: "Error en BBDD", details: error });
        }
      });
      
  

// Middleware para borrar una review
servidor.delete("/reviews/borrar/:id", async (peticion, respuesta) => {
    const id = peticion.params.id;  
    try {
      let count = await borrarReview(id);
      respuesta.json({ resultado: count ? "ok" : "ko" });
    } catch (error) {
      console.error('Error en BBDD al borrar la review:', error);
      respuesta.status(500).json({ error: "Error en BBDD", details: error });
    }
  });
  
  

// Ruta de login
servidor.post("/login", async (peticion, respuesta) => {
    const { username, password } = peticion.body;
    try {
        const usuario = await obtenerUsuario(username, password);
        if (!usuario) {
            return respuesta.status(404).json({ error: 'User not found or incorrect password' });
        }

        peticion.session.usuario = usuario;

        // Obtener el perfil completo del usuario
        const perfil = await obtenerPerfil(usuario._id); // Utiliza el _id del usuario obtenido

        respuesta.json({ message: "Autenticación exitosa", user: perfil }); // Devuelve el perfil completo del usuario

    } catch (error) {
        respuesta.status(500).json({ error: 'Error en la autenticación', details: error.message });
    }
});


servidor.listen(process.env.PORT);