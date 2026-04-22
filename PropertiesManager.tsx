import React from 'react';

const PropertiesManager = () => {
    // ... other state and functions

    return (
        <div>
            <label htmlFor="building">Building:</label>
            <select id="building" name="building">
                <option value="Ramos Mejia">Ramos Mejia</option>
                <option value="Limay">Limay</option>
                <option value="Bolivar">Bolivar</option>
                <option value="Alvear">Alvear</option>
                <option value="Faena">Faena</option>
                <option value="Gaboto">Gaboto</option>
                <option value="Gazcon">Gazcon</option>
                <option value="Otro">Otro</option>
            </select>
            {/* ... other inputs and code */} 
        </div>
    );
};

export default PropertiesManager;