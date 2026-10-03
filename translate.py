# -*- coding: utf-8 -*-

files = ['main.html', 'gym.html', 'health.html', 'po-water.html', 'finance.html', 'caffeine.html', 'avatar-lab.html']

translations = [
    ('>Edit<', '>Editar<'),
    ('>Save<', '>Guardar<'),
    ('>Delete<', '>Eliminar<'),
    ('>Cancel<', '>Cancelar<'),
    ('>Back<', '>Volver<'),
    ('>Close<', '>Cerrar<'),
    ('>Compare<', '>Comparar<'),
    ('>Take Photo<', '>Tomar Foto<'),
    ('>From Library<', '>De Galería<'),
    ('placeholder="Enter weight"', 'placeholder="Ingresar peso"'),
    ('aria-label="Today\'s weight"', 'aria-label="Peso de hoy"'),
    ('>Today<', '>Hoy<'),
    ('>History<', '>Historial<'),
    ('>Settings<', '>Ajustes<'),
    ('>Add<', '>Añadir<'),
    ('>Done<', '>Hecho<'),
    ('>Workout<', '>Rutina<'),
    ('>Exercises<', '>Ejercicios<'),
    ('>Reps<', '>Reps<'),
    ('>Sets<', '>Series<'),
    ('>Weight<', '>Peso<'),
    ('>Rest<', '>Descanso<'),
    ('>Volume<', '>Volumen<'),
    ('>Previous<', '>Anterior<'),
    ('>Next<', '>Siguiente<'),
    ('>Split<', '>Rutina<'),
    ('>Splits<', '>Rutinas<'),
    ('>New Split<', '>Nueva Rutina<'),
    ('>New Exercise<', '>Nuevo Ejercicio<'),
    ('>Drink<', '>Tomar<'),
    ('>Water<', '>Agua<'),
    ('>Goal<', '>Meta<'),
    ('>Net Worth<', '>Patrimonio<'),
    ('>Assets<', '>Activos<'),
    ('>Liabilities<', '>Pasivos<'),
    ('>Expenses<', '>Gastos<'),
    ('>Income<', '>Ingresos<'),
    ('>Transactions<', '>Transacciones<'),
    ('>Balance<', '>Balance<'),
    ('>Total<', '>Total<'),
    ('>Amount<', '>Monto<'),
    ('>Category<', '>Categoría<'),
    ('>Date<', '>Fecha<'),
    ('>Description<', '>Descripción<'),
    ('>Supplements<', '>Suplementos<'),
    ('>Dose<', '>Dosis<'),
    ('>Time<', '>Hora<'),
    ('>Taken<', '>Tomado<'),
    ('>Caffeine<', '>Cafeína<'),
    ('>Coffee<', '>Café<'),
    ('>Tea<', '>Té<'),
    ('>Energy Drink<', '>Bebida Energética<'),
    ('>No data<', '>Sin datos<'),
    ('>Nothing here yet<', '>Nada por aquí aún<'),
    ('>Loading...<', '>Cargando...<')
]

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        for eng, spa in translations:
            content = content.replace(eng, spa)
            
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
            
        print(f"Translated common UI in {f}")
    except Exception as e:
        print(f"Error {f}: {e}")
