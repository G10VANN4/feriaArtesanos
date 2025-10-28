

import React, { useState } from 'react';
import feria1 from '../../public/images/feria1.jpg';
import feria2 from '../../public/images/feria2.jpg';
import feria3 from '../../public/images/feria3.jpg';
import feria4 from '../../public/images/feria4.jpg';
import feria5 from '../../public/images/feria5.jpg';



const images = [
    { id: 1, url: feria1, alt: "pergola" },
    { id: 2, url: feria2, alt: "Puestos de artesanía" },
    { id: 3, url: feria3, alt: "Público disfrutando de la feria" },
    { id: 4, url: feria4, alt: "cantina" },
    { id: 5, url: feria5, alt: "dron feria" },
];

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToPrev = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <section className="carousel-container">
      <img 
        src={images[currentIndex].url} 
        alt={images[currentIndex].alt} 
        className="carousel-image"
      />
      
      <div className="carousel-controls">
        <button className="carousel-btn" onClick={goToPrev}> ‹ </button>
        <button className="carousel-btn" onClick={goToNext}> › </button>
      </div>

      <div className="carousel-indicators">
        {images.map((_, index) => (
          <span
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </section>
  );
};

export default Carousel; 