require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

function conectar() {
    return MongoClient.connect(process.env.URL_MONGO);
}

//Buscamos al usuario en nuestra base de datos que esta en el env
function obtenerUsuario(username, password) {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();
            console.log("Buscando usuario:", username, password);  // Agrega este log para ver los valores que llegan

            let usuario = await conexion
            .db("outdbox")
            .collection("users")
            .findOne({ username, password });

            conexion.close();

            ok(usuario);
        } catch (error) {
            ko({ error: "Error en BBDD", details: error });
        }
    });
}

//Obtenemos información del perfil, reseñas que ha hecho, peliculas favs
function obtenerPerfil(userId) {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();

            // Convertir userId en ObjectId
            const objectId = new ObjectId(userId);

            // Obtener información del usuario
            let usuario = await conexion.db("outdbox").collection("users").findOne({ _id: objectId });

            // Obtener reseñas del usuario
            let reviews = await conexion.db("outdbox").collection("reviews").find({ userId: objectId }).toArray();

            conexion.close();

            // Combinar toda la información en un objeto
            let perfil = {
                ...usuario,
                reviews
            };

            ok(perfil);
        } catch (error) {
            ko({ error: "Error en BBDD", details: error });
        }
    });
}

//Almacenamos las reviews
function reviews() {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();

            let review = await conexion.db("outdbox").collection("reviews").find({}).toArray();

            conexion.close();

            ok(review.map(({ _id, movieId, review, rating, favorite }) => {
                return { id: _id, movieId, review, rating, favorite };
            }));

        } catch (error) {

            ko({ error: "Error en el servidor" });

        }
    });
}

// Como dice su nombre creamos la review :D
function crearReview(userId, movieId, review, rating, favorite) {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();

            // Verificar si los ObjectId son válidos
            if (!ObjectId.isValid(userId)) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            let { insertedId } = await conexion
                .db("outdbox")
                .collection("reviews")
                .insertOne({
                    userId: new ObjectId(userId), // Convertir userId en ObjectId
                    movieId,  // Mantener movieId como string
                    review,
                    rating,
                    favorite,
                    date: new Date()
                });

            conexion.close();
            ok(insertedId);
        } catch (error) {
            ko({ error: "Error en BBDD", details: error });
        }
    });
}

// Editamos nuestra review
function editarReview(id, review, rating, favorite) {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();

            // Convertir id en ObjectId
            const objectId = new ObjectId(id);

            let { modifiedCount } = await conexion
                .db("outdbox")
                .collection("reviews")
                .updateOne(
                    { _id: objectId }, // Convertir id a ObjectId
                    { $set: { review, rating, favorite } }
                );

            conexion.close();

            ok(modifiedCount); // 0 o 1 dependiendo de si se realizó la actualización

        } catch (error) {
            ko({ error: "Error en BBDD", details: error });
        }
    });
}

// La borramos :(
function borrarReview(id) {
    return new Promise(async (ok, ko) => {
        try {
            const conexion = await conectar();

            // Convertir id en ObjectId
            const objectId = new ObjectId(id);

            let { deletedCount } = await conexion
                .db("outdbox")
                .collection("reviews")
                .deleteOne(
                    { _id: objectId } // Convertir id a ObjectId
                );

            conexion.close();

            ok(deletedCount); // 0 o 1 dependiendo de si se realizó la eliminación

        } catch (error) {
            ko({ error: "Error en BBDD", details: error });
        }
    });
}

module.exports = { obtenerUsuario, obtenerPerfil, reviews, crearReview, editarReview, borrarReview };
