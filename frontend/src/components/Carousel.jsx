// src/components/Carousel.jsx
import React, { useState } from 'react';

const images = [
    { id: 1, url: '/images/feria1.jpg', alt: "Artesanos en la feria" },
    { id: 2, url: '/images/feria2.jpg', alt: "Puestos de artesanía" },
    { id: 3, url: '/images/feria3.jpg', alt: "Público disfrutando de la feria" },
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
  
  const currentImage = images[currentIndex].url;

  return (
    <section className="carousel-container">
      
      <img 
        src={currentImage} 
        alt={images[currentIndex].alt} 
        className="carousel-image"
      />
      
      <div className="carousel-controls">
        <button className="carousel-btn left" onClick={goToPrev}> &lt; </button>
        <button className="carousel-btn right" onClick={goToNext}> &gt; </button>
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